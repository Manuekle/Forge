CREATE INDEX "activities_project_created_idx" ON "activities" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "artifacts_project_type_idx" ON "artifacts" USING btree ("project_id","type");--> statement-breakpoint
CREATE INDEX "code_files_project_idx" ON "code_files" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "decisions_project_created_idx" ON "decisions" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "projects_user_updated_idx" ON "projects" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "runs_project_created_idx" ON "runs" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tasks_project_order_idx" ON "tasks" USING btree ("project_id","order");