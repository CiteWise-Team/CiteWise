-- Re-add Foreign Key Relationships for PostgREST / Supabase
ALTER TABLE "document_insights" DROP CONSTRAINT IF EXISTS "document_insights_document_id_fkey";
ALTER TABLE "document_insights" 
  ADD CONSTRAINT "document_insights_document_id_fkey" 
  FOREIGN KEY ("document_id") 
  REFERENCES "uploaded_documents"("id") 
  ON DELETE CASCADE;

ALTER TABLE "evidence_excerpts" DROP CONSTRAINT IF EXISTS "evidence_excerpts_document_insight_id_fkey";
ALTER TABLE "evidence_excerpts" 
  ADD CONSTRAINT "evidence_excerpts_document_insight_id_fkey" 
  FOREIGN KEY ("document_insight_id") 
  REFERENCES "document_insights"("id") 
  ON DELETE CASCADE;
