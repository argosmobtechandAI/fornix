import { Suspense } from "react";
import BulkUploadClient from "./BulkUploadClient";

export default function page() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <BulkUploadClient />
    </Suspense>
  );
}
