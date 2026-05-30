import { imageGenerationBase } from "@/lib/env";
import { createCatchAllProxy } from "@/lib/proxy-handler";

export const { GET, POST, PATCH, PUT, DELETE } = createCatchAllProxy({
  getBaseUrl: imageGenerationBase,
  serviceName: "image-generation"
});
