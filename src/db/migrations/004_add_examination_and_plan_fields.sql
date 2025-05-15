-- Add examination_results and treatment_plan columns to patient_sessions table

ALTER TABLE patient_sessions 
ADD COLUMN examination_results TEXT,
ADD COLUMN treatment_plan TEXT;
