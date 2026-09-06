import type { Resource } from "@/src/types";

export function flattenResourceItems(resources: Resource[]) {
  return resources.flatMap((resource) => resource.items.map((item) => ({ ...item, resourceId: resource.id })));
}