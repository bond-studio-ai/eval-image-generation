--
-- AI Image Generator Admin - Database Schema
-- PostgreSQL 14+
--

-- ============================================
-- Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Custom Types
-- ============================================

-- Rating enum for generation quality assessment
CREATE TYPE generation_rating AS ENUM (
    'FAILED',      -- Generation failed or produced errors
    'POOR',        -- Low quality, major issues present
    'ACCEPTABLE',  -- Meets minimum quality requirements
    'GOOD',        -- High quality output
    'EXCELLENT'    -- Exceptional quality, production-ready
);

-- ============================================
-- Tables
-- ============================================

-- Prompt versions: stores different versions of system and user prompts
CREATE TABLE prompt_version (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Prompt content
    system_prompt TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    
    -- Metadata
    name VARCHAR(255),                              -- Optional human-friendly name
    description TEXT,                               -- Notes about this version
    
    -- Model settings
    model VARCHAR(255),                             -- AI model name (e.g., Nano Banana Pro)
    output_type VARCHAR(50),                        -- Output format (e.g., Image)
    aspect_ratio VARCHAR(20),                       -- Output aspect ratio (e.g., 3:2)
    output_resolution VARCHAR(20),                  -- Resolution setting (e.g., 1K)
    temperature DECIMAL(3,2),                       -- Generation temperature (e.g., 0.8)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,      -- Soft delete support
    
    -- Constraints
    CONSTRAINT system_prompt_not_empty CHECK (LENGTH(TRIM(system_prompt)) > 0),
    CONSTRAINT user_prompt_not_empty CHECK (LENGTH(TRIM(user_prompt)) > 0)
);

COMMENT ON TABLE prompt_version IS 'Stores versioned prompts used for AI image generation';
COMMENT ON COLUMN prompt_version.system_prompt IS 'System prompt that sets AI context and behavior';
COMMENT ON COLUMN prompt_version.user_prompt IS 'User-facing prompt template, may contain placeholders';
COMMENT ON COLUMN prompt_version.deleted_at IS 'Soft delete timestamp - NULL means record is active';


-- Generation: records each image generation run
CREATE TABLE generation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    prompt_version_id UUID NOT NULL,
    
    -- Rating
    result_rating generation_rating NULL,
    
    -- Additional data
    notes TEXT,                                     -- Optional notes or observations about the generation
    execution_time INTEGER,                         -- Time taken to generate in milliseconds
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Foreign keys
    CONSTRAINT fk_generation_prompt_version 
        FOREIGN KEY (prompt_version_id) 
        REFERENCES prompt_version(id)
        ON DELETE RESTRICT  -- Prevent deletion of prompts with existing generations
);

COMMENT ON TABLE generation IS 'Records each image generation run with its rating';
COMMENT ON COLUMN generation.prompt_version_id IS 'The prompt version used for this generation';
COMMENT ON COLUMN generation.result_rating IS 'Quality rating assigned after evaluation (nullable until rated)';


-- Generation image output: stores generated output images
CREATE TABLE generation_image_output (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    generation_id UUID NOT NULL,
    
    -- Image data
    url TEXT NOT NULL,
    
    -- Foreign keys
    CONSTRAINT fk_output_generation 
        FOREIGN KEY (generation_id) 
        REFERENCES generation(id)
        ON DELETE CASCADE,  -- Delete outputs when generation is deleted
    
    -- Constraints
    CONSTRAINT output_url_not_empty CHECK (LENGTH(TRIM(url)) > 0)
);

COMMENT ON TABLE generation_image_output IS 'Stores URLs to generated output images';
COMMENT ON COLUMN generation_image_output.url IS 'URL or path to the generated image file';


-- Generation image input: stores input/reference images
CREATE TABLE generation_image_input (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    generation_id UUID NOT NULL,
    
    -- Image data
    url TEXT NOT NULL,
    
    -- Foreign keys
    CONSTRAINT fk_input_generation 
        FOREIGN KEY (generation_id) 
        REFERENCES generation(id)
        ON DELETE CASCADE,  -- Delete inputs when generation is deleted
    
    -- Constraints
    CONSTRAINT input_url_not_empty CHECK (LENGTH(TRIM(url)) > 0)
);

COMMENT ON TABLE generation_image_input IS 'Stores URLs to input/reference images used for generation';
COMMENT ON COLUMN generation_image_input.url IS 'URL or path to the input reference image';


-- ============================================
-- Indexes
-- ============================================

-- Prompt version indexes
CREATE INDEX idx_prompt_version_created_at ON prompt_version(created_at DESC);
CREATE INDEX idx_prompt_version_active ON prompt_version(created_at DESC) 
    WHERE deleted_at IS NULL;

-- Generation indexes
CREATE INDEX idx_generation_prompt_version ON generation(prompt_version_id);
CREATE INDEX idx_generation_created_at ON generation(created_at DESC);
CREATE INDEX idx_generation_rating ON generation(result_rating) 
    WHERE result_rating IS NOT NULL;
CREATE INDEX idx_generation_unrated ON generation(created_at ASC) 
    WHERE result_rating IS NULL;

-- Image indexes
CREATE INDEX idx_output_generation ON generation_image_output(generation_id);
CREATE INDEX idx_input_generation ON generation_image_input(generation_id);


-- ============================================
-- Views
-- ============================================

-- View: Active prompt versions with generation stats
CREATE OR REPLACE VIEW prompt_version_stats AS
SELECT 
    pv.id,
    pv.name,
    pv.system_prompt,
    pv.user_prompt,
    pv.created_at,
    COUNT(g.id) AS generation_count,
    COUNT(g.id) FILTER (WHERE g.result_rating IS NOT NULL) AS rated_count,
    COUNT(g.id) FILTER (WHERE g.result_rating = 'EXCELLENT') AS excellent_count,
    COUNT(g.id) FILTER (WHERE g.result_rating = 'GOOD') AS good_count,
    COUNT(g.id) FILTER (WHERE g.result_rating = 'ACCEPTABLE') AS acceptable_count,
    COUNT(g.id) FILTER (WHERE g.result_rating = 'POOR') AS poor_count,
    COUNT(g.id) FILTER (WHERE g.result_rating = 'FAILED') AS failed_count,
    ROUND(AVG(CASE g.result_rating
        WHEN 'FAILED' THEN 0
        WHEN 'POOR' THEN 1
        WHEN 'ACCEPTABLE' THEN 2
        WHEN 'GOOD' THEN 3
        WHEN 'EXCELLENT' THEN 4
    END)::NUMERIC, 2) AS avg_rating_score
FROM prompt_version pv
LEFT JOIN generation g ON g.prompt_version_id = pv.id
WHERE pv.deleted_at IS NULL
GROUP BY pv.id;

COMMENT ON VIEW prompt_version_stats IS 'Active prompt versions with aggregated generation statistics';


-- View: Generations with image counts
CREATE OR REPLACE VIEW generation_summary AS
SELECT 
    g.id,
    g.prompt_version_id,
    pv.name AS prompt_name,
    LEFT(pv.user_prompt, 100) AS prompt_preview,
    g.result_rating,
    g.created_at,
    COUNT(DISTINCT gi.id) AS input_image_count,
    COUNT(DISTINCT go.id) AS output_image_count
FROM generation g
JOIN prompt_version pv ON pv.id = g.prompt_version_id
LEFT JOIN generation_image_input gi ON gi.generation_id = g.id
LEFT JOIN generation_image_output go ON go.generation_id = g.id
GROUP BY g.id, pv.id;

COMMENT ON VIEW generation_summary IS 'Generations with prompt info and image counts';


-- ============================================
-- Functions
-- ============================================

-- Function: Soft delete a prompt version
CREATE OR REPLACE FUNCTION soft_delete_prompt_version(version_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE prompt_version 
    SET deleted_at = NOW() 
    WHERE id = version_id AND deleted_at IS NULL;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION soft_delete_prompt_version IS 'Soft deletes a prompt version by setting deleted_at timestamp';


-- Function: Get rating distribution for a date range
CREATE OR REPLACE FUNCTION get_rating_distribution(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    rating generation_rating,
    count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT result_rating
        FROM generation
        WHERE result_rating IS NOT NULL
          AND (start_date IS NULL OR created_at >= start_date)
          AND (end_date IS NULL OR created_at <= end_date)
    ),
    total AS (
        SELECT COUNT(*) AS total_count FROM filtered
    )
    SELECT 
        f.result_rating,
        COUNT(*) AS count,
        ROUND((COUNT(*)::NUMERIC / NULLIF(t.total_count, 0)) * 100, 2) AS percentage
    FROM filtered f
    CROSS JOIN total t
    GROUP BY f.result_rating, t.total_count
    ORDER BY 
        CASE f.result_rating
            WHEN 'EXCELLENT' THEN 1
            WHEN 'GOOD' THEN 2
            WHEN 'ACCEPTABLE' THEN 3
            WHEN 'POOR' THEN 4
            WHEN 'FAILED' THEN 5
        END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_rating_distribution IS 'Returns rating distribution with counts and percentages';


-- ============================================
-- Sample Data (Optional - Remove in Production)
-- ============================================

-- Uncomment below to insert sample data for testing

/*
-- Sample prompt versions
INSERT INTO prompt_version (name, system_prompt, user_prompt) VALUES
(
    'Interior Design v1',
    'You are an expert interior design AI that generates photorealistic room renders. Focus on accurate lighting, realistic materials, and proper perspective.',
    'Generate a {style} style {room_type} with {color_scheme} color scheme. Include natural lighting from {light_source}.'
),
(
    'Product Photography v1', 
    'You are a professional product photography AI. Create clean, well-lit product images suitable for e-commerce.',
    'Create a product shot of {product} on a {background} background with {lighting} lighting.'
),
(
    'Interior Design v2',
    'You are an expert interior design AI that generates photorealistic room renders. Focus on accurate lighting, realistic materials, proper perspective, and ensure furniture is properly scaled.',
    'Generate a {style} style {room_type} with {color_scheme} color scheme. Include natural lighting from {light_source}. Ensure all furniture is properly proportioned.'
);

-- Sample generations
INSERT INTO generation (prompt_version_id, result_rating) 
SELECT id, 'GOOD' FROM prompt_version WHERE name = 'Interior Design v1';

INSERT INTO generation (prompt_version_id, result_rating) 
SELECT id, 'EXCELLENT' FROM prompt_version WHERE name = 'Interior Design v1';

INSERT INTO generation (prompt_version_id, result_rating) 
SELECT id, 'ACCEPTABLE' FROM prompt_version WHERE name = 'Product Photography v1';

INSERT INTO generation (prompt_version_id) 
SELECT id FROM prompt_version WHERE name = 'Interior Design v2';
*/
