import { imageGenerationV2Base } from "@/lib/env";
import { createCatchAllProxy } from "@/lib/proxy-handler";
import { normalizeV2PaginationResponse, rewriteV1PaginationToV2 } from "@/lib/v2-pagination";

export const { GET, POST, PATCH, PUT, DELETE } = createCatchAllProxy({
  getBaseUrl: imageGenerationV2Base,
  serviceName: "image-generation-v2",
  rewriteQuery: rewriteV1PaginationToV2,
  transformJson: normalizeV2PaginationResponse
});
