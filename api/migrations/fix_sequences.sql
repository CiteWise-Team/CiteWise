-- Fix auto-increment sequences for tables after data migration
CREATE SEQUENCE IF NOT EXISTS uploaded_documents_id_seq START WITH 34;
ALTER TABLE "uploaded_documents" ALTER COLUMN "id" SET DEFAULT nextval('uploaded_documents_id_seq');

CREATE SEQUENCE IF NOT EXISTS document_insights_id_seq START WITH 31;
ALTER TABLE "document_insights" ALTER COLUMN "id" SET DEFAULT nextval('document_insights_id_seq');

CREATE SEQUENCE IF NOT EXISTS evidence_excerpts_id_seq START WITH 17;
ALTER TABLE "evidence_excerpts" ALTER COLUMN "id" SET DEFAULT nextval('evidence_excerpts_id_seq');
