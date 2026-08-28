export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  ml_private: {
    Tables: {
      ai_acceptance_commands: {
        Row: {
          acceptance_id: string
          change_event_id: string
          command_type: string
          created_at: string
          field_key: string
          id: string
          revision: number
          sort_order: number
          studio_id: string
          target_entity_id: string
          target_entity_type: string
          updated_at: string
        }
        Insert: {
          acceptance_id: string
          change_event_id: string
          command_type: string
          created_at?: string
          field_key: string
          id?: string
          revision?: number
          sort_order?: number
          studio_id: string
          target_entity_id: string
          target_entity_type: string
          updated_at?: string
        }
        Update: {
          acceptance_id?: string
          change_event_id?: string
          command_type?: string
          created_at?: string
          field_key?: string
          id?: string
          revision?: number
          sort_order?: number
          studio_id?: string
          target_entity_id?: string
          target_entity_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_acceptance_commands_acceptance_fk"
            columns: ["studio_id", "acceptance_id"]
            isOneToOne: false
            referencedRelation: "ai_artifact_acceptances"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "ai_acceptance_commands_change_event_fk"
            columns: ["studio_id", "change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "ai_acceptance_commands_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_artifact_acceptances: {
        Row: {
          accepted_at: string
          accepted_payload_checksum: string
          actor_id: string
          ai_artifact_id: string
          candidate_checksum: string
          created_at: string
          decision_note: string
          id: string
          operation_id: string
          revision: number
          source_checksum: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string
          accepted_payload_checksum: string
          actor_id: string
          ai_artifact_id: string
          candidate_checksum: string
          created_at?: string
          decision_note: string
          id?: string
          operation_id: string
          revision?: number
          source_checksum: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string
          accepted_payload_checksum?: string
          actor_id?: string
          ai_artifact_id?: string
          candidate_checksum?: string
          created_at?: string
          decision_note?: string
          id?: string
          operation_id?: string
          revision?: number
          source_checksum?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_artifact_acceptances_artifact_fk"
            columns: ["studio_id", "ai_artifact_id"]
            isOneToOne: true
            referencedRelation: "ai_artifacts"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "ai_artifact_acceptances_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_artifact_media: {
        Row: {
          ai_artifact_id: string
          asset_id: string
          created_at: string
          id: string
          revision: number
          role: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          ai_artifact_id: string
          asset_id: string
          created_at?: string
          id?: string
          revision?: number
          role: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          ai_artifact_id?: string
          asset_id?: string
          created_at?: string
          id?: string
          revision?: number
          role?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_artifact_media_artifact_fk"
            columns: ["studio_id", "ai_artifact_id"]
            isOneToOne: false
            referencedRelation: "ai_artifacts"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "ai_artifact_media_asset_fk"
            columns: ["studio_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "ai_artifact_media_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_artifacts: {
        Row: {
          acceptance_operation_id: string | null
          accepted_payload_checksum: string | null
          ai_job_id: string
          artifact_type: string
          candidate_checksum: string
          candidate_json: Json
          confidence_json: Json
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: Database["ml_private"]["Enums"]["ai_decision"]
          decision_reason: string | null
          field_manifest_json: Json
          generated_at: string
          id: string
          provenance_json: Json
          revision: number
          source_checksum: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          acceptance_operation_id?: string | null
          accepted_payload_checksum?: string | null
          ai_job_id: string
          artifact_type: string
          candidate_checksum: string
          candidate_json: Json
          confidence_json?: Json
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["ml_private"]["Enums"]["ai_decision"]
          decision_reason?: string | null
          field_manifest_json?: Json
          generated_at?: string
          id?: string
          provenance_json: Json
          revision?: number
          source_checksum: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          acceptance_operation_id?: string | null
          accepted_payload_checksum?: string | null
          ai_job_id?: string
          artifact_type?: string
          candidate_checksum?: string
          candidate_json?: Json
          confidence_json?: Json
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["ml_private"]["Enums"]["ai_decision"]
          decision_reason?: string | null
          field_manifest_json?: Json
          generated_at?: string
          id?: string
          provenance_json?: Json
          revision?: number
          source_checksum?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_artifacts_job_fk"
            columns: ["studio_id", "ai_job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "ai_artifacts_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_job_input_refs: {
        Row: {
          ai_job_id: string
          created_at: string
          entity_id: string
          entity_revision: number
          entity_type: string
          field_path: string
          id: string
          revision: number
          sort_order: number
          source_checksum: string
          source_version_id: string | null
          studio_id: string
          updated_at: string
        }
        Insert: {
          ai_job_id: string
          created_at?: string
          entity_id: string
          entity_revision: number
          entity_type: string
          field_path?: string
          id?: string
          revision?: number
          sort_order?: number
          source_checksum: string
          source_version_id?: string | null
          studio_id: string
          updated_at?: string
        }
        Update: {
          ai_job_id?: string
          created_at?: string
          entity_id?: string
          entity_revision?: number
          entity_type?: string
          field_path?: string
          id?: string
          revision?: number
          sort_order?: number
          source_checksum?: string
          source_version_id?: string | null
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_job_input_refs_job_fk"
            columns: ["studio_id", "ai_job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "ai_job_input_refs_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_job_input_refs_version_fk"
            columns: ["studio_id", "source_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      ai_jobs: {
        Row: {
          attempt_no: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          garment_id: string | null
          id: string
          idempotency_key: string | null
          input_refs_json: Json
          job_type: string
          model: string
          prompt_version: string
          provider: string
          requested_by: string | null
          retry_of_job_id: string | null
          revision: number
          source_checksum: string
          started_at: string | null
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          attempt_no?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          garment_id?: string | null
          id?: string
          idempotency_key?: string | null
          input_refs_json?: Json
          job_type: string
          model: string
          prompt_version: string
          provider?: string
          requested_by?: string | null
          retry_of_job_id?: string | null
          revision?: number
          source_checksum: string
          started_at?: string | null
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          attempt_no?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          garment_id?: string | null
          id?: string
          idempotency_key?: string | null
          input_refs_json?: Json
          job_type?: string
          model?: string
          prompt_version?: string
          provider?: string
          requested_by?: string | null
          retry_of_job_id?: string | null
          revision?: number
          source_checksum?: string
          started_at?: string | null
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "ai_jobs_retry_of_job_fk"
            columns: ["studio_id", "retry_of_job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "ai_jobs_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_items: {
        Row: {
          component_variant_id: string | null
          cost_impact: number
          created_at: string
          currency: string
          description: string
          id: string
          intentional_free_text: boolean
          item_type: string
          material_variant_id: string | null
          placement: string | null
          quantity: number
          revision: number
          shortage_quantity: number
          sort_order: number
          spec_id: string
          status: string
          studio_id: string
          substitute_item_id: string | null
          supplier_item_id: string | null
          unit: Database["ml_private"]["Enums"]["quantity_unit"]
          unit_cost: number
          updated_at: string
        }
        Insert: {
          component_variant_id?: string | null
          cost_impact?: number
          created_at?: string
          currency?: string
          description: string
          id?: string
          intentional_free_text?: boolean
          item_type: string
          material_variant_id?: string | null
          placement?: string | null
          quantity?: number
          revision?: number
          shortage_quantity?: number
          sort_order?: number
          spec_id: string
          status?: string
          studio_id: string
          substitute_item_id?: string | null
          supplier_item_id?: string | null
          unit: Database["ml_private"]["Enums"]["quantity_unit"]
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          component_variant_id?: string | null
          cost_impact?: number
          created_at?: string
          currency?: string
          description?: string
          id?: string
          intentional_free_text?: boolean
          item_type?: string
          material_variant_id?: string | null
          placement?: string | null
          quantity?: number
          revision?: number
          shortage_quantity?: number
          sort_order?: number
          spec_id?: string
          status?: string
          studio_id?: string
          substitute_item_id?: string | null
          supplier_item_id?: string | null
          unit?: Database["ml_private"]["Enums"]["quantity_unit"]
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_items_component_variant_fk"
            columns: ["studio_id", "component_variant_id"]
            isOneToOne: false
            referencedRelation: "component_variants"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "bom_items_material_variant_fk"
            columns: ["studio_id", "material_variant_id"]
            isOneToOne: false
            referencedRelation: "material_variants"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "bom_items_spec_fk"
            columns: ["studio_id", "spec_id"]
            isOneToOne: false
            referencedRelation: "technical_specs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "bom_items_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_substitute_item_fk"
            columns: ["studio_id", "substitute_item_id"]
            isOneToOne: false
            referencedRelation: "bom_items"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "bom_items_supplier_item_fk"
            columns: ["studio_id", "supplier_item_id"]
            isOneToOne: false
            referencedRelation: "supplier_items"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          assignee_id: string | null
          created_at: string
          ends_at: string | null
          event_type: string
          garment_id: string | null
          id: string
          revision: number
          starts_at: string
          studio_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          ends_at?: string | null
          event_type: string
          garment_id?: string | null
          id?: string
          revision?: number
          starts_at: string
          studio_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          ends_at?: string | null
          event_type?: string
          garment_id?: string | null
          id?: string
          revision?: number
          starts_at?: string
          studio_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "calendar_events_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_operation_receipts: {
        Row: {
          actor_id: string
          created_at: string
          garment_id: string | null
          id: string
          mutation_count: number
          origin: string
          receipt_kind: string
          request_checksum: string | null
          result_json: Json
          studio_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          garment_id?: string | null
          id: string
          mutation_count: number
          origin: string
          receipt_kind?: string
          request_checksum?: string | null
          result_json: Json
          studio_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          garment_id?: string | null
          id?: string
          mutation_count?: number
          origin?: string
          receipt_kind?: string
          request_checksum?: string | null
          result_json?: Json
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_operation_receipts_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "canonical_operation_receipts_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      change_events: {
        Row: {
          actor_id: string | null
          base_revision: number | null
          created_at: string
          entity_id: string
          entity_type: string
          garment_id: string | null
          id: string
          inverse_patch: Json
          json_patch: Json
          occurred_at: string
          operation: string
          operation_id: string
          origin: string
          related_operation_ids: string[]
          result_revision: number | null
          scope_json: Json
          studio_id: string
        }
        Insert: {
          actor_id?: string | null
          base_revision?: number | null
          created_at?: string
          entity_id: string
          entity_type: string
          garment_id?: string | null
          id?: string
          inverse_patch?: Json
          json_patch?: Json
          occurred_at?: string
          operation: string
          operation_id: string
          origin: string
          related_operation_ids?: string[]
          result_revision?: number | null
          scope_json?: Json
          studio_id: string
        }
        Update: {
          actor_id?: string | null
          base_revision?: number | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          garment_id?: string | null
          id?: string
          inverse_patch?: Json
          json_patch?: Json
          occurred_at?: string
          operation?: string
          operation_id?: string
          origin?: string
          related_operation_ids?: string[]
          result_revision?: number | null
          scope_json?: Json
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_events_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "change_events_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          revision: number
          season: string | null
          sort_order: number
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          revision?: number
          season?: string | null
          sort_order?: number
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          revision?: number
          season?: string | null
          sort_order?: number
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      component_variants: {
        Row: {
          color: string | null
          component_id: string
          created_at: string
          finish: string | null
          id: string
          revision: number
          size: string | null
          sku: string | null
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          component_id: string
          created_at?: string
          finish?: string | null
          id?: string
          revision?: number
          size?: string | null
          sku?: string | null
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          component_id?: string
          created_at?: string
          finish?: string | null
          id?: string
          revision?: number
          size?: string | null
          sku?: string | null
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_variants_component_fk"
            columns: ["studio_id", "component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "component_variants_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      components: {
        Row: {
          archived_at: string | null
          category: string
          component_code: string
          created_at: string
          id: string
          name: string
          revision: number
          spec_json: Json
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category: string
          component_code: string
          created_at?: string
          id?: string
          name: string
          revision?: number
          spec_json?: Json
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          component_code?: string
          created_at?: string
          id?: string
          name?: string
          revision?: number
          spec_json?: Json
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "components_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_details: {
        Row: {
          anchor_json: Json
          asset_id: string | null
          callout: string
          created_at: string
          id: string
          revision: number
          severity: string
          sort_order: number
          status: string
          step_id: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          anchor_json?: Json
          asset_id?: string | null
          callout: string
          created_at?: string
          id?: string
          revision?: number
          severity?: string
          sort_order?: number
          status?: string
          step_id: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          anchor_json?: Json
          asset_id?: string | null
          callout?: string
          created_at?: string
          id?: string
          revision?: number
          severity?: string
          sort_order?: number
          status?: string
          step_id?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "construction_details_asset_fk"
            columns: ["studio_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "construction_details_step_fk"
            columns: ["studio_id", "step_id"]
            isOneToOne: false
            referencedRelation: "construction_steps"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "construction_details_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_sections: {
        Row: {
          created_at: string
          id: string
          name: string
          revision: number
          sort_order: number
          spec_id: string
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          revision?: number
          sort_order?: number
          spec_id: string
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          revision?: number
          sort_order?: number
          spec_id?: string
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "construction_sections_spec_fk"
            columns: ["studio_id", "spec_id"]
            isOneToOne: false
            referencedRelation: "technical_specs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "construction_sections_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_steps: {
        Row: {
          created_at: string
          id: string
          machine: string | null
          machine_required: boolean
          operation: string
          revision: number
          seam_allowance: number | null
          section_id: string
          sort_order: number
          status: string
          step_number: number
          stitch_required: boolean
          stitch_spec: string | null
          studio_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          machine?: string | null
          machine_required?: boolean
          operation: string
          revision?: number
          seam_allowance?: number | null
          section_id: string
          sort_order?: number
          status?: string
          step_number: number
          stitch_required?: boolean
          stitch_spec?: string | null
          studio_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          machine?: string | null
          machine_required?: boolean
          operation?: string
          revision?: number
          seam_allowance?: number | null
          section_id?: string
          sort_order?: number
          status?: string
          step_number?: number
          stitch_required?: boolean
          stitch_spec?: string | null
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "construction_steps_section_fk"
            columns: ["studio_id", "section_id"]
            isOneToOne: false
            referencedRelation: "construction_sections"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "construction_steps_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_items: {
        Row: {
          basis: string
          bom_item_id: string | null
          category: string
          component_variant_id: string | null
          cost_sheet_id: string
          created_at: string
          currency: string
          description: string
          id: string
          material_variant_id: string | null
          quantity: number
          revision: number
          sort_order: number
          studio_id: string
          total: number | null
          unit_cost: number
          updated_at: string
          waste_pct: number
        }
        Insert: {
          basis?: string
          bom_item_id?: string | null
          category: string
          component_variant_id?: string | null
          cost_sheet_id: string
          created_at?: string
          currency: string
          description: string
          id?: string
          material_variant_id?: string | null
          quantity?: number
          revision?: number
          sort_order?: number
          studio_id: string
          total?: number | null
          unit_cost: number
          updated_at?: string
          waste_pct?: number
        }
        Update: {
          basis?: string
          bom_item_id?: string | null
          category?: string
          component_variant_id?: string | null
          cost_sheet_id?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          material_variant_id?: string | null
          quantity?: number
          revision?: number
          sort_order?: number
          studio_id?: string
          total?: number | null
          unit_cost?: number
          updated_at?: string
          waste_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_items_bom_fk"
            columns: ["studio_id", "bom_item_id"]
            isOneToOne: false
            referencedRelation: "bom_items"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "cost_items_component_variant_fk"
            columns: ["studio_id", "component_variant_id"]
            isOneToOne: false
            referencedRelation: "component_variants"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "cost_items_material_variant_fk"
            columns: ["studio_id", "material_variant_id"]
            isOneToOne: false
            referencedRelation: "material_variants"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "cost_items_sheet_fk"
            columns: ["studio_id", "cost_sheet_id"]
            isOneToOne: false
            referencedRelation: "cost_sheets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "cost_items_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_sheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          calculated_total: number
          cogs_per_unit: number
          created_at: string
          currency: string
          garment_id: string
          garment_version_id: string | null
          id: string
          margin_pct: number
          name: string
          quantity_basis: number
          revision: number
          status: string
          studio_id: string
          updated_at: string
          wholesale_unit_price: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          calculated_total?: number
          cogs_per_unit?: number
          created_at?: string
          currency: string
          garment_id: string
          garment_version_id?: string | null
          id?: string
          margin_pct?: number
          name?: string
          quantity_basis?: number
          revision?: number
          status?: string
          studio_id: string
          updated_at?: string
          wholesale_unit_price?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          calculated_total?: number
          cogs_per_unit?: number
          created_at?: string
          currency?: string
          garment_id?: string
          garment_version_id?: string | null
          id?: string
          margin_pct?: number
          name?: string
          quantity_basis?: number
          revision?: number
          status?: string
          studio_id?: string
          updated_at?: string
          wholesale_unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_sheets_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "cost_sheets_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_sheets_version_fk"
            columns: ["studio_id", "garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      design_annotations: {
        Row: {
          anchor_json: Json
          asset_id: string
          author_id: string | null
          body: string
          created_at: string
          garment_id: string
          id: string
          revision: number
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          anchor_json: Json
          asset_id: string
          author_id?: string | null
          body: string
          created_at?: string
          garment_id: string
          id?: string
          revision?: number
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          anchor_json?: Json
          asset_id?: string
          author_id?: string | null
          body?: string
          created_at?: string
          garment_id?: string
          id?: string
          revision?: number
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_annotations_asset_fk"
            columns: ["studio_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "design_annotations_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "design_annotations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      design_briefs: {
        Row: {
          color_story: string | null
          created_at: string
          garment_id: string
          id: string
          intent: string | null
          key_features: string[]
          revision: number
          silhouette: string | null
          studio_id: string
          target_wearer: string | null
          updated_at: string
        }
        Insert: {
          color_story?: string | null
          created_at?: string
          garment_id: string
          id?: string
          intent?: string | null
          key_features?: string[]
          revision?: number
          silhouette?: string | null
          studio_id: string
          target_wearer?: string | null
          updated_at?: string
        }
        Update: {
          color_story?: string | null
          created_at?: string
          garment_id?: string
          id?: string
          intent?: string | null
          key_features?: string[]
          revision?: number
          silhouette?: string | null
          studio_id?: string
          target_wearer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_briefs_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: true
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "design_briefs_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_assets: {
        Row: {
          asset_id: string
          collection_id: string
          created_at: string
          id: string
          revision: number
          role: string
          sort_order: number
          studio_id: string
          updated_at: string
          usage_json: Json
        }
        Insert: {
          asset_id: string
          collection_id: string
          created_at?: string
          id?: string
          revision?: number
          role: string
          sort_order?: number
          studio_id: string
          updated_at?: string
          usage_json?: Json
        }
        Update: {
          asset_id?: string
          collection_id?: string
          created_at?: string
          id?: string
          revision?: number
          role?: string
          sort_order?: number
          studio_id?: string
          updated_at?: string
          usage_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "editorial_assets_asset_fk"
            columns: ["studio_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "editorial_assets_collection_fk"
            columns: ["studio_id", "collection_id"]
            isOneToOne: false
            referencedRelation: "editorial_collections"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "editorial_assets_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_blocks: {
        Row: {
          ai_artifact_id: string | null
          block_type: string
          content_json: Json
          created_at: string
          id: string
          live_source: string | null
          revision: number
          scene_id: string
          settings_json: Json
          sort_order: number
          source_checksum: string | null
          source_entity_id: string | null
          source_field_path: string | null
          source_garment_id: string | null
          source_version_id: string | null
          staleness: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          ai_artifact_id?: string | null
          block_type: string
          content_json?: Json
          created_at?: string
          id?: string
          live_source?: string | null
          revision?: number
          scene_id: string
          settings_json?: Json
          sort_order?: number
          source_checksum?: string | null
          source_entity_id?: string | null
          source_field_path?: string | null
          source_garment_id?: string | null
          source_version_id?: string | null
          staleness?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          ai_artifact_id?: string | null
          block_type?: string
          content_json?: Json
          created_at?: string
          id?: string
          live_source?: string | null
          revision?: number
          scene_id?: string
          settings_json?: Json
          sort_order?: number
          source_checksum?: string | null
          source_entity_id?: string | null
          source_field_path?: string | null
          source_garment_id?: string | null
          source_version_id?: string | null
          staleness?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_blocks_ai_artifact_id_fkey"
            columns: ["ai_artifact_id"]
            isOneToOne: false
            referencedRelation: "ai_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_blocks_scene_fk"
            columns: ["studio_id", "scene_id"]
            isOneToOne: false
            referencedRelation: "editorial_scenes"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "editorial_blocks_source_garment_fk"
            columns: ["studio_id", "source_garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "editorial_blocks_source_version_fk"
            columns: ["studio_id", "source_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "editorial_blocks_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_collection_garments: {
        Row: {
          collection_id: string
          created_at: string
          garment_id: string
          id: string
          revision: number
          role: string
          sort_order: number
          studio_id: string
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          garment_id: string
          id?: string
          revision?: number
          role: string
          sort_order?: number
          studio_id: string
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          garment_id?: string
          id?: string
          revision?: number
          role?: string
          sort_order?: number
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_collection_garments_collection_fk"
            columns: ["studio_id", "collection_id"]
            isOneToOne: false
            referencedRelation: "editorial_collections"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "editorial_collection_garments_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "editorial_collection_garments_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_collections: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string
          export_settings_json: Json
          garment_id: string
          id: string
          primary_garment_version_id: string | null
          published_at: string | null
          published_by: string | null
          revision: number
          status: string
          studio_id: string
          subtitle: string
          template_type: string
          theme_id: string | null
          title: string
          transition_json: Json
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string
          export_settings_json?: Json
          garment_id: string
          id?: string
          primary_garment_version_id?: string | null
          published_at?: string | null
          published_by?: string | null
          revision?: number
          status?: string
          studio_id: string
          subtitle?: string
          template_type: string
          theme_id?: string | null
          title: string
          transition_json?: Json
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string
          export_settings_json?: Json
          garment_id?: string
          id?: string
          primary_garment_version_id?: string | null
          published_at?: string | null
          published_by?: string | null
          revision?: number
          status?: string
          studio_id?: string
          subtitle?: string
          template_type?: string
          theme_id?: string | null
          title?: string
          transition_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_collections_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "editorial_collections_primary_version_fk"
            columns: ["studio_id", "primary_garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "editorial_collections_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_exports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          checksum: string
          collection_id: string
          collection_revision: number
          created_at: string
          format: string
          generated_at: string
          id: string
          manifest_json: Json
          revision: number
          source_garment_version_id: string | null
          storage_path: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          checksum: string
          collection_id: string
          collection_revision: number
          created_at?: string
          format: string
          generated_at?: string
          id?: string
          manifest_json: Json
          revision?: number
          source_garment_version_id?: string | null
          storage_path: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          checksum?: string
          collection_id?: string
          collection_revision?: number
          created_at?: string
          format?: string
          generated_at?: string
          id?: string
          manifest_json?: Json
          revision?: number
          source_garment_version_id?: string | null
          storage_path?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_exports_collection_fk"
            columns: ["studio_id", "collection_id"]
            isOneToOne: false
            referencedRelation: "editorial_collections"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "editorial_exports_source_version_fk"
            columns: ["studio_id", "source_garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "editorial_exports_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_scenes: {
        Row: {
          background_json: Json
          collection_id: string
          created_at: string
          description: string
          id: string
          narrative_role: string
          revision: number
          scene_type: string
          sort_order: number
          studio_id: string
          subtitle: string
          title: string | null
          transition_json: Json
          updated_at: string
        }
        Insert: {
          background_json?: Json
          collection_id: string
          created_at?: string
          description?: string
          id?: string
          narrative_role?: string
          revision?: number
          scene_type: string
          sort_order?: number
          studio_id: string
          subtitle?: string
          title?: string | null
          transition_json?: Json
          updated_at?: string
        }
        Update: {
          background_json?: Json
          collection_id?: string
          created_at?: string
          description?: string
          id?: string
          narrative_role?: string
          revision?: number
          scene_type?: string
          sort_order?: number
          studio_id?: string
          subtitle?: string
          title?: string | null
          transition_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_scenes_collection_fk"
            columns: ["studio_id", "collection_id"]
            isOneToOne: false
            referencedRelation: "editorial_collections"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "editorial_scenes_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_revisions: {
        Row: {
          checksum: string
          created_at: string
          entity_id: string
          entity_type: string
          garment_version_id: string
          id: string
          operation: string
          scope: string
          snapshot_json: Json
          studio_id: string
        }
        Insert: {
          checksum: string
          created_at?: string
          entity_id: string
          entity_type: string
          garment_version_id: string
          id?: string
          operation: string
          scope?: string
          snapshot_json: Json
          studio_id: string
        }
        Update: {
          checksum?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          garment_version_id?: string
          id?: string
          operation?: string
          scope?: string
          snapshot_json?: Json
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_revisions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_revisions_version_fk"
            columns: ["studio_id", "garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      factories: {
        Row: {
          archived_at: string | null
          capabilities_json: Json
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          lead_time_days: number | null
          minimum_order_quantity: number | null
          name: string
          phone: string | null
          revision: number
          status: string
          studio_id: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          capabilities_json?: Json
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          lead_time_days?: number | null
          minimum_order_quantity?: number | null
          name: string
          phone?: string | null
          revision?: number
          status?: string
          studio_id: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          capabilities_json?: Json
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          lead_time_days?: number | null
          minimum_order_quantity?: number | null
          name?: string
          phone?: string | null
          revision?: number
          status?: string
          studio_id?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factories_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factories_supplier_fk"
            columns: ["studio_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      fit_issue_promotions: {
        Row: {
          candidate_json: Json
          construction_detail_id: string | null
          created_at: string
          created_by: string | null
          fit_issue_id: string
          garment_id: string
          garment_version_id: string
          id: string
          note: string
          pom_point_id: string | null
          promotion_type: string
          resolved_at: string | null
          revision: number
          status: string
          studio_id: string
          task_id: string | null
          updated_at: string
        }
        Insert: {
          candidate_json?: Json
          construction_detail_id?: string | null
          created_at?: string
          created_by?: string | null
          fit_issue_id: string
          garment_id: string
          garment_version_id: string
          id?: string
          note?: string
          pom_point_id?: string | null
          promotion_type: string
          resolved_at?: string | null
          revision?: number
          status?: string
          studio_id: string
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          candidate_json?: Json
          construction_detail_id?: string | null
          created_at?: string
          created_by?: string | null
          fit_issue_id?: string
          garment_id?: string
          garment_version_id?: string
          id?: string
          note?: string
          pom_point_id?: string | null
          promotion_type?: string
          resolved_at?: string | null
          revision?: number
          status?: string
          studio_id?: string
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fit_issue_promotions_construction_detail_fk"
            columns: ["studio_id", "construction_detail_id"]
            isOneToOne: false
            referencedRelation: "construction_details"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_issue_promotions_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_issue_promotions_issue_fk"
            columns: ["studio_id", "fit_issue_id"]
            isOneToOne: false
            referencedRelation: "fit_issues"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_issue_promotions_pom_fk"
            columns: ["studio_id", "pom_point_id"]
            isOneToOne: false
            referencedRelation: "pom_points"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_issue_promotions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fit_issue_promotions_task_fk"
            columns: ["studio_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_issue_promotions_version_fk"
            columns: ["studio_id", "garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      fit_issues: {
        Row: {
          area: string
          created_at: string
          fit_session_id: string
          garment_version_id: string | null
          id: string
          observation: string
          owner_task_id: string | null
          pom_point_id: string | null
          resolution: string | null
          revision: number
          severity: string
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          fit_session_id: string
          garment_version_id?: string | null
          id?: string
          observation: string
          owner_task_id?: string | null
          pom_point_id?: string | null
          resolution?: string | null
          revision?: number
          severity: string
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          fit_session_id?: string
          garment_version_id?: string | null
          id?: string
          observation?: string
          owner_task_id?: string | null
          pom_point_id?: string | null
          resolution?: string | null
          revision?: number
          severity?: string
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fit_issues_owner_task_fk"
            columns: ["studio_id", "owner_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_issues_pom_fk"
            columns: ["studio_id", "pom_point_id"]
            isOneToOne: false
            referencedRelation: "pom_points"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_issues_session_fk"
            columns: ["studio_id", "fit_session_id"]
            isOneToOne: false
            referencedRelation: "fit_sessions"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_issues_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fit_issues_version_fk"
            columns: ["studio_id", "garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      fit_measurements: {
        Row: {
          actual: number
          created_at: string
          fit_session_id: string | null
          garment_version_id: string | null
          id: string
          pom_point_id: string
          revision: number
          sample_round_id: string
          size: string
          studio_id: string
          updated_at: string
          variance: number | null
        }
        Insert: {
          actual: number
          created_at?: string
          fit_session_id?: string | null
          garment_version_id?: string | null
          id?: string
          pom_point_id: string
          revision?: number
          sample_round_id: string
          size: string
          studio_id: string
          updated_at?: string
          variance?: number | null
        }
        Update: {
          actual?: number
          created_at?: string
          fit_session_id?: string | null
          garment_version_id?: string | null
          id?: string
          pom_point_id?: string
          revision?: number
          sample_round_id?: string
          size?: string
          studio_id?: string
          updated_at?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fit_measurements_pom_fk"
            columns: ["studio_id", "pom_point_id"]
            isOneToOne: false
            referencedRelation: "pom_points"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_measurements_round_fk"
            columns: ["studio_id", "sample_round_id"]
            isOneToOne: false
            referencedRelation: "sample_rounds"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_measurements_session_fk"
            columns: ["studio_id", "fit_session_id"]
            isOneToOne: false
            referencedRelation: "fit_sessions"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_measurements_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fit_measurements_version_fk"
            columns: ["studio_id", "garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      fit_session_media: {
        Row: {
          asset_id: string
          capture_status: string
          captured_at: string
          created_at: string
          fit_session_id: string
          id: string
          retry_count: number
          revision: number
          role: string
          sort_order: number
          studio_id: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          capture_status?: string
          captured_at?: string
          created_at?: string
          fit_session_id: string
          id?: string
          retry_count?: number
          revision?: number
          role?: string
          sort_order?: number
          studio_id: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          capture_status?: string
          captured_at?: string
          created_at?: string
          fit_session_id?: string
          id?: string
          retry_count?: number
          revision?: number
          role?: string
          sort_order?: number
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fit_session_media_asset_fk"
            columns: ["studio_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_session_media_session_fk"
            columns: ["studio_id", "fit_session_id"]
            isOneToOne: false
            referencedRelation: "fit_sessions"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_session_media_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      fit_sessions: {
        Row: {
          created_at: string
          decision: string | null
          decision_note: string
          fit_date: string
          garment_version_id: string | null
          id: string
          model_profile_json: Json
          revision: number
          sample_round_id: string
          status: string
          studio_id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision?: string | null
          decision_note?: string
          fit_date: string
          garment_version_id?: string | null
          id?: string
          model_profile_json?: Json
          revision?: number
          sample_round_id: string
          status?: string
          studio_id: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision?: string | null
          decision_note?: string
          fit_date?: string
          garment_version_id?: string | null
          id?: string
          model_profile_json?: Json
          revision?: number
          sample_round_id?: string
          status?: string
          studio_id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fit_sessions_round_fk"
            columns: ["studio_id", "sample_round_id"]
            isOneToOne: false
            referencedRelation: "sample_rounds"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "fit_sessions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fit_sessions_version_fk"
            columns: ["studio_id", "garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      flat_annotations: {
        Row: {
          anchor_json: Json
          created_at: string
          detail: string | null
          flat_id: string
          id: string
          label: string
          revision: number
          severity: string
          sort_order: number
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          anchor_json: Json
          created_at?: string
          detail?: string | null
          flat_id: string
          id?: string
          label: string
          revision?: number
          severity?: string
          sort_order?: number
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          anchor_json?: Json
          created_at?: string
          detail?: string | null
          flat_id?: string
          id?: string
          label?: string
          revision?: number
          severity?: string
          sort_order?: number
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flat_annotations_flat_fk"
            columns: ["studio_id", "flat_id"]
            isOneToOne: false
            referencedRelation: "technical_flats"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "flat_annotations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_components: {
        Row: {
          created_at: string
          garment_id: string
          id: string
          placement: string | null
          quantity: number
          revision: number
          status: string
          studio_id: string
          unit: Database["ml_private"]["Enums"]["quantity_unit"]
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          garment_id: string
          id?: string
          placement?: string | null
          quantity?: number
          revision?: number
          status?: string
          studio_id: string
          unit?: Database["ml_private"]["Enums"]["quantity_unit"]
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          garment_id?: string
          id?: string
          placement?: string | null
          quantity?: number
          revision?: number
          status?: string
          studio_id?: string
          unit?: Database["ml_private"]["Enums"]["quantity_unit"]
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "garment_components_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "garment_components_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_components_variant_fk"
            columns: ["studio_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "component_variants"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      garment_materials: {
        Row: {
          created_at: string
          garment_id: string
          id: string
          placement: string | null
          required_quantity: number
          reserved_quantity: number
          revision: number
          role: string
          status: string
          studio_id: string
          unit: Database["ml_private"]["Enums"]["quantity_unit"]
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          garment_id: string
          id?: string
          placement?: string | null
          required_quantity?: number
          reserved_quantity?: number
          revision?: number
          role: string
          status?: string
          studio_id: string
          unit: Database["ml_private"]["Enums"]["quantity_unit"]
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          garment_id?: string
          id?: string
          placement?: string | null
          required_quantity?: number
          reserved_quantity?: number
          revision?: number
          role?: string
          status?: string
          studio_id?: string
          unit?: Database["ml_private"]["Enums"]["quantity_unit"]
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "garment_materials_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "garment_materials_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_materials_variant_fk"
            columns: ["studio_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "material_variants"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      garment_media: {
        Row: {
          asset_id: string
          created_at: string
          framing_json: Json
          garment_id: string
          id: string
          revision: number
          role: string
          sort_order: number
          studio_id: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          framing_json?: Json
          garment_id: string
          id?: string
          revision?: number
          role: string
          sort_order?: number
          studio_id: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          framing_json?: Json
          garment_id?: string
          id?: string
          revision?: number
          role?: string
          sort_order?: number
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garment_media_asset_fk"
            columns: ["studio_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "garment_media_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "garment_media_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_tags: {
        Row: {
          created_at: string
          garment_id: string
          studio_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          garment_id: string
          studio_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          garment_id?: string
          studio_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "garment_tags_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "garment_tags_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_tags_tag_fk"
            columns: ["studio_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      garment_versions: {
        Row: {
          base_revision: number
          checksum: string
          created_at: string
          created_by: string | null
          garment_id: string
          id: string
          label: string
          notes: string
          parent_version_id: string | null
          scope_json: Json
          snapshot_json: Json
          studio_id: string
          version_kind: string
          version_no: number
        }
        Insert: {
          base_revision?: number
          checksum: string
          created_at?: string
          created_by?: string | null
          garment_id: string
          id?: string
          label: string
          notes?: string
          parent_version_id?: string | null
          scope_json?: Json
          snapshot_json: Json
          studio_id: string
          version_kind?: string
          version_no: number
        }
        Update: {
          base_revision?: number
          checksum?: string
          created_at?: string
          created_by?: string | null
          garment_id?: string
          id?: string
          label?: string
          notes?: string
          parent_version_id?: string | null
          scope_json?: Json
          snapshot_json?: Json
          studio_id?: string
          version_kind?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "garment_versions_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "garment_versions_parent_fk"
            columns: ["studio_id", "garment_id", "parent_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "garment_id", "id"]
          },
          {
            foreignKeyName: "garment_versions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      garments: {
        Row: {
          archived_at: string | null
          collection_id: string | null
          created_at: string
          current_version_id: string | null
          garment_code: string
          garment_type: string | null
          id: string
          phase: string
          revision: number
          status: string
          studio_id: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          collection_id?: string | null
          created_at?: string
          current_version_id?: string | null
          garment_code: string
          garment_type?: string | null
          id?: string
          phase?: string
          revision?: number
          status?: string
          studio_id: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          collection_id?: string | null
          created_at?: string
          current_version_id?: string | null
          garment_code?: string
          garment_type?: string | null
          id?: string
          phase?: string
          revision?: number
          status?: string
          studio_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garments_collection_fk"
            columns: ["studio_id", "collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "garments_current_version_fk"
            columns: ["studio_id", "id", "current_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "garment_id", "id"]
          },
          {
            foreignKeyName: "garments_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_rule_values: {
        Row: {
          created_at: string
          delta: number
          from_size: string
          grade_rule_id: string
          id: string
          pom_point_id: string
          revision: number
          studio_id: string
          to_size: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delta: number
          from_size: string
          grade_rule_id: string
          id?: string
          pom_point_id: string
          revision?: number
          studio_id: string
          to_size: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delta?: number
          from_size?: string
          grade_rule_id?: string
          id?: string
          pom_point_id?: string
          revision?: number
          studio_id?: string
          to_size?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_rule_values_pom_fk"
            columns: ["studio_id", "pom_point_id"]
            isOneToOne: false
            referencedRelation: "pom_points"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "grade_rule_values_rule_fk"
            columns: ["studio_id", "grade_rule_id"]
            isOneToOne: false
            referencedRelation: "grade_rules"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "grade_rule_values_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_rules: {
        Row: {
          created_at: string
          id: string
          name: string
          revision: number
          size_range_json: Json
          spec_id: string
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          revision?: number
          size_range_json: Json
          spec_id: string
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          revision?: number
          size_range_json?: Json
          spec_id?: string
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_rules_spec_fk"
            columns: ["studio_id", "spec_id"]
            isOneToOne: false
            referencedRelation: "technical_specs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "grade_rules_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      inspiration_boards: {
        Row: {
          created_at: string
          garment_id: string
          id: string
          layout_json: Json
          revision: number
          sort_order: number
          studio_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          garment_id: string
          id?: string
          layout_json?: Json
          revision?: number
          sort_order?: number
          studio_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          garment_id?: string
          id?: string
          layout_json?: Json
          revision?: number
          sort_order?: number
          studio_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspiration_boards_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "inspiration_boards_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      inspiration_items: {
        Row: {
          asset_id: string
          board_id: string
          caption: string | null
          created_at: string
          id: string
          position_json: Json
          revision: number
          sort_order: number
          studio_id: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          board_id: string
          caption?: string | null
          created_at?: string
          id?: string
          position_json?: Json
          revision?: number
          sort_order?: number
          studio_id: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          board_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          position_json?: Json
          revision?: number
          sort_order?: number
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspiration_items_asset_fk"
            columns: ["studio_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "inspiration_items_board_fk"
            columns: ["studio_id", "board_id"]
            isOneToOne: false
            referencedRelation: "inspiration_boards"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "inspiration_items_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_entries: {
        Row: {
          actor_id: string | null
          created_at: string
          entry_type: string
          id: string
          note: string | null
          occurred_at: string
          quantity: number
          studio_id: string
          unit: Database["ml_private"]["Enums"]["quantity_unit"]
          variant_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entry_type: string
          id?: string
          note?: string | null
          occurred_at?: string
          quantity: number
          studio_id: string
          unit: Database["ml_private"]["Enums"]["quantity_unit"]
          variant_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entry_type?: string
          id?: string
          note?: string | null
          occurred_at?: string
          quantity?: number
          studio_id?: string
          unit?: Database["ml_private"]["Enums"]["quantity_unit"]
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_entries_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_entries_variant_fk"
            columns: ["studio_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "material_variants"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      material_variants: {
        Row: {
          color_hex: string | null
          color_name: string | null
          created_at: string
          id: string
          material_id: string
          revision: number
          sku: string | null
          status: string
          studio_id: string
          updated_at: string
          weight_gsm: number | null
          width: number | null
          width_unit: Database["ml_private"]["Enums"]["measurement_unit"] | null
        }
        Insert: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          material_id: string
          revision?: number
          sku?: string | null
          status?: string
          studio_id: string
          updated_at?: string
          weight_gsm?: number | null
          width?: number | null
          width_unit?:
            | Database["ml_private"]["Enums"]["measurement_unit"]
            | null
        }
        Update: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          material_id?: string
          revision?: number
          sku?: string | null
          status?: string
          studio_id?: string
          updated_at?: string
          weight_gsm?: number | null
          width?: number | null
          width_unit?:
            | Database["ml_private"]["Enums"]["measurement_unit"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "material_variants_material_fk"
            columns: ["studio_id", "material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "material_variants_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          archived_at: string | null
          category: string
          composition: string | null
          created_at: string
          id: string
          material_code: string
          name: string
          revision: number
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category: string
          composition?: string | null
          created_at?: string
          id?: string
          material_code: string
          name: string
          revision?: number
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          composition?: string | null
          created_at?: string
          id?: string
          material_code?: string
          name?: string
          revision?: number
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_sets: {
        Row: {
          base_size: string
          created_at: string
          id: string
          name: string
          revision: number
          sample_type: string | null
          spec_id: string
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          base_size: string
          created_at?: string
          id?: string
          name: string
          revision?: number
          sample_type?: string | null
          spec_id: string
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          base_size?: string
          created_at?: string
          id?: string
          name?: string
          revision?: number
          sample_type?: string | null
          spec_id?: string
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_sets_spec_fk"
            columns: ["studio_id", "spec_id"]
            isOneToOne: false
            referencedRelation: "technical_specs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "measurement_sets_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_values: {
        Row: {
          created_at: string
          id: string
          pom_point_id: string
          revision: number
          set_id: string
          size: string
          studio_id: string
          target: number
          tolerance_minus: number
          tolerance_plus: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pom_point_id: string
          revision?: number
          set_id: string
          size: string
          studio_id: string
          target: number
          tolerance_minus?: number
          tolerance_plus?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pom_point_id?: string
          revision?: number
          set_id?: string
          size?: string
          studio_id?: string
          target?: number
          tolerance_minus?: number
          tolerance_plus?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_values_pom_fk"
            columns: ["studio_id", "pom_point_id"]
            isOneToOne: false
            referencedRelation: "pom_points"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "measurement_values_set_fk"
            columns: ["studio_id", "set_id"]
            isOneToOne: false
            referencedRelation: "measurement_sets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "measurement_values_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          checksum: string
          created_at: string
          created_by: string | null
          duration_ms: number | null
          height: number | null
          id: string
          mime_type: string
          original_filename: string
          revision: number
          rights_json: Json
          size_bytes: number
          storage_path: string
          studio_id: string
          updated_at: string
          width: number | null
        }
        Insert: {
          checksum: string
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          height?: number | null
          id?: string
          mime_type: string
          original_filename: string
          revision?: number
          rights_json?: Json
          size_bytes: number
          storage_path: string
          studio_id: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          checksum?: string
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          height?: number | null
          id?: string
          mime_type?: string
          original_filename?: string
          revision?: number
          rights_json?: Json
          size_bytes?: number
          storage_path?: string
          studio_id?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      media_derivatives: {
        Row: {
          checksum: string
          created_at: string
          height: number | null
          id: string
          mime_type: string
          revision: number
          size_bytes: number
          source_asset_id: string
          storage_path: string
          studio_id: string
          updated_at: string
          variant: string
          width: number | null
        }
        Insert: {
          checksum: string
          created_at?: string
          height?: number | null
          id?: string
          mime_type: string
          revision?: number
          size_bytes: number
          source_asset_id: string
          storage_path: string
          studio_id: string
          updated_at?: string
          variant: string
          width?: number | null
        }
        Update: {
          checksum?: string
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string
          revision?: number
          size_bytes?: number
          source_asset_id?: string
          storage_path?: string
          studio_id?: string
          updated_at?: string
          variant?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_derivatives_source_fk"
            columns: ["studio_id", "source_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "media_derivatives_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      pom_points: {
        Row: {
          code: string
          created_at: string
          diagram_anchor_json: Json
          id: string
          method: string
          name: string
          revision: number
          sort_order: number
          spec_id: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          diagram_anchor_json?: Json
          id?: string
          method: string
          name: string
          revision?: number
          sort_order?: number
          spec_id: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          diagram_anchor_json?: Json
          id?: string
          method?: string
          name?: string
          revision?: number
          sort_order?: number
          spec_id?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pom_points_spec_fk"
            columns: ["studio_id", "spec_id"]
            isOneToOne: false
            referencedRelation: "technical_specs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "pom_points_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_editorial_assets: {
        Row: {
          alt_text: string
          asset_id: string
          collection_id: string
          created_at: string
          id: string
          profile_id: string
          revision: number
          role: string
          sort_order: number
          studio_id: string
          updated_at: string
        }
        Insert: {
          alt_text?: string
          asset_id: string
          collection_id: string
          created_at?: string
          id?: string
          profile_id: string
          revision?: number
          role?: string
          sort_order?: number
          studio_id: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          asset_id?: string
          collection_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          revision?: number
          role?: string
          sort_order?: number
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_editorial_assets_asset_fk"
            columns: ["studio_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_editorial_assets_selection_fk"
            columns: ["studio_id", "profile_id", "collection_id"]
            isOneToOne: false
            referencedRelation: "portfolio_editorials"
            referencedColumns: ["studio_id", "profile_id", "collection_id"]
          },
          {
            foreignKeyName: "portfolio_editorial_assets_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_editorial_scenes: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          profile_id: string
          revision: number
          scene_id: string
          sort_order: number
          studio_id: string
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          profile_id: string
          revision?: number
          scene_id: string
          sort_order?: number
          studio_id: string
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          revision?: number
          scene_id?: string
          sort_order?: number
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_editorial_scenes_scene_fk"
            columns: ["studio_id", "scene_id"]
            isOneToOne: false
            referencedRelation: "editorial_scenes"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_editorial_scenes_selection_fk"
            columns: ["studio_id", "profile_id", "collection_id"]
            isOneToOne: false
            referencedRelation: "portfolio_editorials"
            referencedColumns: ["studio_id", "profile_id", "collection_id"]
          },
          {
            foreignKeyName: "portfolio_editorial_scenes_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_editorials: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          profile_id: string
          revision: number
          slug: string
          sort_order: number
          source_version_id: string | null
          studio_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          profile_id: string
          revision?: number
          slug: string
          sort_order?: number
          source_version_id?: string | null
          studio_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          revision?: number
          slug?: string
          sort_order?: number
          source_version_id?: string | null
          studio_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_editorials_collection_fk"
            columns: ["studio_id", "collection_id"]
            isOneToOne: false
            referencedRelation: "editorial_collections"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_editorials_profile_fk"
            columns: ["studio_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "portfolio_profiles"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_editorials_source_version_fk"
            columns: ["studio_id", "source_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_editorials_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_profiles: {
        Row: {
          archived_at: string | null
          avatar_asset_id: string | null
          bio: string | null
          created_at: string
          display_name: string
          headline: string | null
          id: string
          location: string
          public_email: string
          resume_public_url: string
          revision: number
          status: string
          studio_id: string
          updated_at: string
          username_slug: string
        }
        Insert: {
          archived_at?: string | null
          avatar_asset_id?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          headline?: string | null
          id?: string
          location?: string
          public_email?: string
          resume_public_url?: string
          revision?: number
          status?: string
          studio_id: string
          updated_at?: string
          username_slug: string
        }
        Update: {
          archived_at?: string | null
          avatar_asset_id?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          headline?: string | null
          id?: string
          location?: string
          public_email?: string
          resume_public_url?: string
          revision?: number
          status?: string
          studio_id?: string
          updated_at?: string
          username_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_profiles_avatar_asset_fk"
            columns: ["studio_id", "avatar_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_profiles_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: true
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_project_assets: {
        Row: {
          alt_text: string
          asset_id: string
          created_at: string
          id: string
          portfolio_project_id: string
          revision: number
          role: string
          sort_order: number
          studio_id: string
          updated_at: string
        }
        Insert: {
          alt_text?: string
          asset_id: string
          created_at?: string
          id?: string
          portfolio_project_id: string
          revision?: number
          role: string
          sort_order?: number
          studio_id: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          asset_id?: string
          created_at?: string
          id?: string
          portfolio_project_id?: string
          revision?: number
          role?: string
          sort_order?: number
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_project_assets_asset_fk"
            columns: ["studio_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_project_assets_project_fk"
            columns: ["studio_id", "portfolio_project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_project_assets_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projects: {
        Row: {
          archived_at: string | null
          case_study_json: Json
          created_at: string
          featured: boolean
          garment_id: string
          id: string
          include_technical_excerpt: boolean
          profile_id: string
          revision: number
          slug: string
          sort_order: number
          source_version_id: string | null
          studio_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          case_study_json?: Json
          created_at?: string
          featured?: boolean
          garment_id: string
          id?: string
          include_technical_excerpt?: boolean
          profile_id: string
          revision?: number
          slug: string
          sort_order?: number
          source_version_id?: string | null
          studio_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          case_study_json?: Json
          created_at?: string
          featured?: boolean
          garment_id?: string
          id?: string
          include_technical_excerpt?: boolean
          profile_id?: string
          revision?: number
          slug?: string
          sort_order?: number
          source_version_id?: string | null
          studio_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_projects_profile_fk"
            columns: ["studio_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "portfolio_profiles"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_projects_source_version_fk"
            columns: ["studio_id", "source_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_projects_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_technical_excerpts: {
        Row: {
          approved_at: string
          approved_by: string | null
          created_at: string
          garment_version_id: string
          id: string
          portfolio_project_id: string
          profile_id: string
          public_download_asset_id: string | null
          revision: number
          studio_id: string
          summary: string
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          created_at?: string
          garment_version_id: string
          id?: string
          portfolio_project_id: string
          profile_id: string
          public_download_asset_id?: string | null
          revision?: number
          studio_id: string
          summary: string
          title: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          created_at?: string
          garment_version_id?: string
          id?: string
          portfolio_project_id?: string
          profile_id?: string
          public_download_asset_id?: string | null
          revision?: number
          studio_id?: string
          summary?: string
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_technical_excerpts_download_fk"
            columns: ["studio_id", "public_download_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_technical_excerpts_profile_fk"
            columns: ["studio_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "portfolio_profiles"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_technical_excerpts_project_fk"
            columns: ["studio_id", "portfolio_project_id"]
            isOneToOne: true
            referencedRelation: "portfolio_projects"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "portfolio_technical_excerpts_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_technical_excerpts_version_fk"
            columns: ["studio_id", "garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      production_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          name: string
          owner_id: string | null
          production_order_id: string
          revision: number
          sort_order: number
          status: string
          studio_id: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          production_order_id: string
          revision?: number
          sort_order?: number
          status?: string
          studio_id: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          production_order_id?: string
          revision?: number
          sort_order?: number
          status?: string
          studio_id?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_milestones_order_fk"
            columns: ["studio_id", "production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "production_milestones_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cost_sheet_id: string | null
          created_at: string
          factory_id: string
          garment_id: string
          garment_version_id: string
          id: string
          order_code: string
          placed_at: string | null
          quantity: number
          revision: number
          status: string
          studio_id: string
          target_delivery_date: string | null
          target_ship_date: string | null
          target_start_date: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cost_sheet_id?: string | null
          created_at?: string
          factory_id: string
          garment_id: string
          garment_version_id: string
          id?: string
          order_code: string
          placed_at?: string | null
          quantity: number
          revision?: number
          status?: string
          studio_id: string
          target_delivery_date?: string | null
          target_ship_date?: string | null
          target_start_date?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cost_sheet_id?: string | null
          created_at?: string
          factory_id?: string
          garment_id?: string
          garment_version_id?: string
          id?: string
          order_code?: string
          placed_at?: string | null
          quantity?: number
          revision?: number
          status?: string
          studio_id?: string
          target_delivery_date?: string | null
          target_ship_date?: string | null
          target_start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_cost_sheet_fk"
            columns: ["studio_id", "cost_sheet_id"]
            isOneToOne: false
            referencedRelation: "cost_sheets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "production_orders_factory_fk"
            columns: ["studio_id", "factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "production_orders_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "production_orders_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_version_fk"
            columns: ["studio_id", "garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_asset_id: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          revision: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_asset_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          revision?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_asset_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          revision?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_avatar_asset_fk"
            columns: ["avatar_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      public_cut_batches: {
        Row: {
          checksum: string
          committed_at: string | null
          created_at: string
          created_by: string
          expected_object_paths: string[]
          failure_code: string | null
          failure_detail: string | null
          id: string
          profile_id: string
          publication_ids: string[]
          source_manifest_json: Json
          status: string
          studio_id: string
          unpublished_at: string | null
        }
        Insert: {
          checksum: string
          committed_at?: string | null
          created_at?: string
          created_by: string
          expected_object_paths?: string[]
          failure_code?: string | null
          failure_detail?: string | null
          id: string
          profile_id: string
          publication_ids: string[]
          source_manifest_json: Json
          status?: string
          studio_id: string
          unpublished_at?: string | null
        }
        Update: {
          checksum?: string
          committed_at?: string | null
          created_at?: string
          created_by?: string
          expected_object_paths?: string[]
          failure_code?: string | null
          failure_detail?: string | null
          id?: string
          profile_id?: string
          publication_ids?: string[]
          source_manifest_json?: Json
          status?: string
          studio_id?: string
          unpublished_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_cut_batches_profile_fk"
            columns: ["studio_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "portfolio_profiles"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "public_cut_batches_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_inspections: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          garment_version_id: string
          id: string
          inspected_at: string | null
          inspected_by: string | null
          production_order_id: string
          release_decision: string
          revision: number
          status: string
          studio_id: string
          template_id: string
          template_version: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          garment_version_id: string
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          production_order_id: string
          release_decision?: string
          revision?: number
          status?: string
          studio_id: string
          template_id: string
          template_version: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          garment_version_id?: string
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          production_order_id?: string
          release_decision?: string
          revision?: number
          status?: string
          studio_id?: string
          template_id?: string
          template_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_inspections_order_fk"
            columns: ["studio_id", "production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "qc_inspections_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_inspections_template_fk"
            columns: ["studio_id", "template_id"]
            isOneToOne: false
            referencedRelation: "qc_templates"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "qc_inspections_version_fk"
            columns: ["studio_id", "garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      qc_results: {
        Row: {
          check_code: string
          created_at: string
          evidence_asset_id: string | null
          id: string
          inspected_at: string
          inspected_by: string | null
          inspection_id: string | null
          issue_task_id: string | null
          notes: string
          production_order_id: string
          result: string
          revision: number
          severity: string
          studio_id: string
          template_check_id: string | null
          updated_at: string
        }
        Insert: {
          check_code: string
          created_at?: string
          evidence_asset_id?: string | null
          id?: string
          inspected_at?: string
          inspected_by?: string | null
          inspection_id?: string | null
          issue_task_id?: string | null
          notes: string
          production_order_id: string
          result: string
          revision?: number
          severity: string
          studio_id: string
          template_check_id?: string | null
          updated_at?: string
        }
        Update: {
          check_code?: string
          created_at?: string
          evidence_asset_id?: string | null
          id?: string
          inspected_at?: string
          inspected_by?: string | null
          inspection_id?: string | null
          issue_task_id?: string | null
          notes?: string
          production_order_id?: string
          result?: string
          revision?: number
          severity?: string
          studio_id?: string
          template_check_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_results_evidence_asset_fk"
            columns: ["studio_id", "evidence_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "qc_results_inspection_fk"
            columns: ["studio_id", "inspection_id"]
            isOneToOne: false
            referencedRelation: "qc_inspections"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "qc_results_issue_task_fk"
            columns: ["studio_id", "issue_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "qc_results_order_fk"
            columns: ["studio_id", "production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "qc_results_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_results_template_check_fk"
            columns: ["studio_id", "template_check_id"]
            isOneToOne: false
            referencedRelation: "qc_template_checks"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      qc_template_checks: {
        Row: {
          check_code: string
          created_at: string
          description: string
          id: string
          method: string
          name: string
          required: boolean
          revision: number
          severity: string
          sort_order: number
          studio_id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          check_code: string
          created_at?: string
          description?: string
          id?: string
          method?: string
          name: string
          required?: boolean
          revision?: number
          severity: string
          sort_order?: number
          studio_id: string
          template_id: string
          updated_at?: string
        }
        Update: {
          check_code?: string
          created_at?: string
          description?: string
          id?: string
          method?: string
          name?: string
          required?: boolean
          revision?: number
          severity?: string
          sort_order?: number
          studio_id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_template_checks_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_template_checks_template_fk"
            columns: ["studio_id", "template_id"]
            isOneToOne: false
            referencedRelation: "qc_templates"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      qc_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          revision: number
          status: string
          studio_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          revision?: number
          status?: string
          studio_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          revision?: number
          status?: string
          studio_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "qc_templates_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_waivers: {
        Row: {
          actor_id: string
          affected_check_code: string
          created_at: string
          follow_up_task_id: string
          id: string
          inspection_id: string
          qc_result_id: string
          reason: string
          revision: number
          studio_id: string
          updated_at: string
          waived_at: string
        }
        Insert: {
          actor_id: string
          affected_check_code: string
          created_at?: string
          follow_up_task_id: string
          id?: string
          inspection_id: string
          qc_result_id: string
          reason: string
          revision?: number
          studio_id: string
          updated_at?: string
          waived_at?: string
        }
        Update: {
          actor_id?: string
          affected_check_code?: string
          created_at?: string
          follow_up_task_id?: string
          id?: string
          inspection_id?: string
          qc_result_id?: string
          reason?: string
          revision?: number
          studio_id?: string
          updated_at?: string
          waived_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_waivers_inspection_fk"
            columns: ["studio_id", "inspection_id"]
            isOneToOne: false
            referencedRelation: "qc_inspections"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "qc_waivers_result_fk"
            columns: ["studio_id", "qc_result_id"]
            isOneToOne: true
            referencedRelation: "qc_results"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "qc_waivers_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_waivers_task_fk"
            columns: ["studio_id", "follow_up_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      restore_operations: {
        Row: {
          actor_id: string | null
          base_revision: number
          created_at: string
          dependency_json: Json
          garment_id: string
          id: string
          inverse_patch: Json
          preview_checksum: string
          reason: string
          replay_patch: Json
          result_revision: number
          result_version_id: string
          scope_json: Json
          selected_keys_json: Json
          source_version_id: string
          studio_id: string
        }
        Insert: {
          actor_id?: string | null
          base_revision: number
          created_at?: string
          dependency_json?: Json
          garment_id: string
          id?: string
          inverse_patch?: Json
          preview_checksum: string
          reason: string
          replay_patch?: Json
          result_revision: number
          result_version_id: string
          scope_json?: Json
          selected_keys_json?: Json
          source_version_id: string
          studio_id: string
        }
        Update: {
          actor_id?: string | null
          base_revision?: number
          created_at?: string
          dependency_json?: Json
          garment_id?: string
          id?: string
          inverse_patch?: Json
          preview_checksum?: string
          reason?: string
          replay_patch?: Json
          result_revision?: number
          result_version_id?: string
          scope_json?: Json
          selected_keys_json?: Json
          source_version_id?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restore_operations_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "restore_operations_result_fk"
            columns: ["studio_id", "result_version_id"]
            isOneToOne: true
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "restore_operations_source_fk"
            columns: ["studio_id", "source_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "restore_operations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_round_media: {
        Row: {
          asset_id: string
          capture_status: string
          captured_at: string
          created_at: string
          id: string
          retry_count: number
          revision: number
          role: string
          sample_round_id: string
          sort_order: number
          studio_id: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          capture_status?: string
          captured_at?: string
          created_at?: string
          id?: string
          retry_count?: number
          revision?: number
          role?: string
          sample_round_id: string
          sort_order?: number
          studio_id: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          capture_status?: string
          captured_at?: string
          created_at?: string
          id?: string
          retry_count?: number
          revision?: number
          role?: string
          sample_round_id?: string
          sort_order?: number
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_round_media_asset_fk"
            columns: ["studio_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "sample_round_media_round_fk"
            columns: ["studio_id", "sample_round_id"]
            isOneToOne: false
            referencedRelation: "sample_rounds"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "sample_round_media_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_rounds: {
        Row: {
          created_at: string
          factory_id: string | null
          garment_id: string
          garment_version_id: string | null
          id: string
          notes: string
          received_at: string | null
          requested_at: string | null
          revision: number
          round_no: number
          sample_type: string
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          factory_id?: string | null
          garment_id: string
          garment_version_id?: string | null
          id?: string
          notes?: string
          received_at?: string | null
          requested_at?: string | null
          revision?: number
          round_no: number
          sample_type: string
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          factory_id?: string | null
          garment_id?: string
          garment_version_id?: string | null
          id?: string
          notes?: string
          received_at?: string | null
          requested_at?: string | null
          revision?: number
          round_no?: number
          sample_type?: string
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_rounds_factory_fk"
            columns: ["studio_id", "factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "sample_rounds_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "sample_rounds_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_rounds_version_fk"
            columns: ["studio_id", "garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      studio_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          revision: number
          role: Database["ml_private"]["Enums"]["membership_role"]
          status: Database["ml_private"]["Enums"]["membership_status"]
          studio_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          revision?: number
          role: Database["ml_private"]["Enums"]["membership_role"]
          status?: Database["ml_private"]["Enums"]["membership_status"]
          studio_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          revision?: number
          role?: Database["ml_private"]["Enums"]["membership_role"]
          status?: Database["ml_private"]["Enums"]["membership_status"]
          studio_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_members_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_settings: {
        Row: {
          ai_policy: Json
          created_at: string
          currency: string
          revision: number
          studio_id: string
          units: Database["ml_private"]["Enums"]["measurement_unit"]
          updated_at: string
          version_policy: Json
        }
        Insert: {
          ai_policy?: Json
          created_at?: string
          currency?: string
          revision?: number
          studio_id: string
          units?: Database["ml_private"]["Enums"]["measurement_unit"]
          updated_at?: string
          version_policy?: Json
        }
        Update: {
          ai_policy?: Json
          created_at?: string
          currency?: string
          revision?: number
          studio_id?: string
          units?: Database["ml_private"]["Enums"]["measurement_unit"]
          updated_at?: string
          version_policy?: Json
        }
        Relationships: [
          {
            foreignKeyName: "studio_settings_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: true
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          owner_user_id: string
          revision: number
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          revision?: number
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          revision?: number
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_items: {
        Row: {
          component_variant_id: string | null
          created_at: string
          currency: string
          id: string
          is_preferred: boolean
          item_type: string
          lead_time_days: number | null
          material_variant_id: string | null
          minimum_order_quantity: number | null
          purchase_unit: Database["ml_private"]["Enums"]["quantity_unit"]
          revision: number
          sku: string | null
          studio_id: string
          supplier_id: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          component_variant_id?: string | null
          created_at?: string
          currency: string
          id?: string
          is_preferred?: boolean
          item_type: string
          lead_time_days?: number | null
          material_variant_id?: string | null
          minimum_order_quantity?: number | null
          purchase_unit: Database["ml_private"]["Enums"]["quantity_unit"]
          revision?: number
          sku?: string | null
          studio_id: string
          supplier_id: string
          unit_cost: number
          updated_at?: string
        }
        Update: {
          component_variant_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_preferred?: boolean
          item_type?: string
          lead_time_days?: number | null
          material_variant_id?: string | null
          minimum_order_quantity?: number | null
          purchase_unit?: Database["ml_private"]["Enums"]["quantity_unit"]
          revision?: number
          sku?: string | null
          studio_id?: string
          supplier_id?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_items_component_variant_fk"
            columns: ["studio_id", "component_variant_id"]
            isOneToOne: false
            referencedRelation: "component_variants"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "supplier_items_material_variant_fk"
            columns: ["studio_id", "material_variant_id"]
            isOneToOne: false
            referencedRelation: "material_variants"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "supplier_items_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_items_supplier_fk"
            columns: ["studio_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      suppliers: {
        Row: {
          archived_at: string | null
          capabilities_json: Json
          contact_email: string | null
          contact_name: string | null
          created_at: string
          default_lead_time_days: number | null
          id: string
          minimum_order_quantity: number | null
          name: string
          phone: string | null
          revision: number
          status: string
          studio_id: string
          supplier_type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          archived_at?: string | null
          capabilities_json?: Json
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          default_lead_time_days?: number | null
          id?: string
          minimum_order_quantity?: number | null
          name: string
          phone?: string | null
          revision?: number
          status?: string
          studio_id: string
          supplier_type: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          archived_at?: string | null
          capabilities_json?: Json
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          default_lead_time_days?: number | null
          id?: string
          minimum_order_quantity?: number | null
          name?: string
          phone?: string | null
          revision?: number
          status?: string
          studio_id?: string
          supplier_type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_tombstones: {
        Row: {
          client_id: string
          created_at: string
          deleted_at: string
          entity_type: string
          id: string
          revision: number
          studio_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deleted_at?: string
          entity_type: string
          id?: string
          revision?: number
          studio_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deleted_at?: string
          entity_type?: string
          id?: string
          revision?: number
          studio_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_tombstones_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          revision: number
          scope: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          revision?: number
          scope?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          revision?: number
          scope?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string | null
          due_at: string | null
          garment_id: string | null
          id: string
          priority: string
          revision: number
          sort_order: number
          status: string
          studio_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          garment_id?: string | null
          id?: string
          priority?: string
          revision?: number
          sort_order?: number
          status?: string
          studio_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          garment_id?: string | null
          id?: string
          priority?: string
          revision?: number
          sort_order?: number
          status?: string
          studio_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "tasks_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_pack_exports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          checksum: string
          created_at: string
          created_by: string | null
          deterministic_filename: string
          export_asset_id: string
          format: string
          garment_version_id: string
          generated_at: string
          id: string
          ruleset_version: string
          section_manifest_json: Json
          source_revision_label: string
          spec_id: string
          storage_path: string
          studio_id: string
          template_id: string
          template_version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          checksum: string
          created_at?: string
          created_by?: string | null
          deterministic_filename: string
          export_asset_id: string
          format: string
          garment_version_id: string
          generated_at?: string
          id?: string
          ruleset_version: string
          section_manifest_json?: Json
          source_revision_label: string
          spec_id: string
          storage_path: string
          studio_id: string
          template_id: string
          template_version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          checksum?: string
          created_at?: string
          created_by?: string | null
          deterministic_filename?: string
          export_asset_id?: string
          format?: string
          garment_version_id?: string
          generated_at?: string
          id?: string
          ruleset_version?: string
          section_manifest_json?: Json
          source_revision_label?: string
          spec_id?: string
          storage_path?: string
          studio_id?: string
          template_id?: string
          template_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tech_pack_exports_asset_fk"
            columns: ["studio_id", "export_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "tech_pack_exports_spec_fk"
            columns: ["studio_id", "spec_id"]
            isOneToOne: false
            referencedRelation: "technical_specs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "tech_pack_exports_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_pack_exports_template_fk"
            columns: ["studio_id", "template_id"]
            isOneToOne: false
            referencedRelation: "technical_templates"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "tech_pack_exports_version_fk"
            columns: ["studio_id", "garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      technical_files: {
        Row: {
          asset_id: string
          created_at: string
          file_type: string
          id: string
          is_source: boolean
          revision: number
          spec_id: string
          studio_id: string
          updated_at: string
          version_label: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          file_type: string
          id?: string
          is_source?: boolean
          revision?: number
          spec_id: string
          studio_id: string
          updated_at?: string
          version_label?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          file_type?: string
          id?: string
          is_source?: boolean
          revision?: number
          spec_id?: string
          studio_id?: string
          updated_at?: string
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_files_asset_fk"
            columns: ["studio_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "technical_files_spec_fk"
            columns: ["studio_id", "spec_id"]
            isOneToOne: false
            referencedRelation: "technical_specs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "technical_files_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_flats: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          asset_id: string
          created_at: string
          id: string
          revision: number
          sort_order: number
          source: string
          spec_id: string
          studio_id: string
          updated_at: string
          view: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          asset_id: string
          created_at?: string
          id?: string
          revision?: number
          sort_order?: number
          source: string
          spec_id: string
          studio_id: string
          updated_at?: string
          view: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string
          created_at?: string
          id?: string
          revision?: number
          sort_order?: number
          source?: string
          spec_id?: string
          studio_id?: string
          updated_at?: string
          view?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_flats_asset_fk"
            columns: ["studio_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "technical_flats_spec_fk"
            columns: ["studio_id", "spec_id"]
            isOneToOne: false
            referencedRelation: "technical_specs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "technical_flats_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_specs: {
        Row: {
          base_size: string
          created_at: string
          garment_id: string
          id: string
          release_validation_run_id: string | null
          release_version_id: string | null
          released_at: string | null
          released_by: string | null
          revision: number
          revision_label: string
          status: string
          studio_id: string
          unit: Database["ml_private"]["Enums"]["measurement_unit"]
          updated_at: string
        }
        Insert: {
          base_size: string
          created_at?: string
          garment_id: string
          id?: string
          release_validation_run_id?: string | null
          release_version_id?: string | null
          released_at?: string | null
          released_by?: string | null
          revision?: number
          revision_label?: string
          status?: string
          studio_id: string
          unit: Database["ml_private"]["Enums"]["measurement_unit"]
          updated_at?: string
        }
        Update: {
          base_size?: string
          created_at?: string
          garment_id?: string
          id?: string
          release_validation_run_id?: string | null
          release_version_id?: string | null
          released_at?: string | null
          released_by?: string | null
          revision?: number
          revision_label?: string
          status?: string
          studio_id?: string
          unit?: Database["ml_private"]["Enums"]["measurement_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_specs_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: true
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "technical_specs_release_validation_run_fk"
            columns: ["studio_id", "release_validation_run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "technical_specs_release_version_fk"
            columns: ["studio_id", "release_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "technical_specs_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          payload_json: Json
          revision: number
          status: string
          studio_id: string
          template_type: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          payload_json: Json
          revision?: number
          status?: string
          studio_id: string
          template_type: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          payload_json?: Json
          revision?: number
          status?: string
          studio_id?: string
          template_type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "technical_templates_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      template_applications: {
        Row: {
          applied_at: string
          applied_by: string | null
          created_at: string
          garment_id: string
          id: string
          mapping_json: Json
          studio_id: string
          template_id: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          created_at?: string
          garment_id: string
          id?: string
          mapping_json?: Json
          studio_id: string
          template_id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          created_at?: string
          garment_id?: string
          id?: string
          mapping_json?: Json
          studio_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_applications_garment_fk"
            columns: ["studio_id", "garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "template_applications_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_applications_template_fk"
            columns: ["studio_id", "template_id"]
            isOneToOne: false
            referencedRelation: "technical_templates"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      validation_runs: {
        Row: {
          created_at: string
          created_by: string | null
          garment_version_id: string | null
          id: string
          result_json: Json
          ruleset_version: string
          spec_id: string
          status: string
          studio_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          garment_version_id?: string | null
          id?: string
          result_json: Json
          ruleset_version: string
          spec_id: string
          status: string
          studio_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          garment_version_id?: string | null
          id?: string
          result_json?: Json
          ruleset_version?: string
          spec_id?: string
          status?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_runs_spec_fk"
            columns: ["studio_id", "spec_id"]
            isOneToOne: false
            referencedRelation: "technical_specs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "validation_runs_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_runs_version_fk"
            columns: ["studio_id", "garment_version_id"]
            isOneToOne: false
            referencedRelation: "garment_versions"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      validation_waivers: {
        Row: {
          actor_id: string
          created_at: string
          domain: string
          follow_up_task_id: string
          id: string
          reason: string
          rule_code: string
          spec_id: string
          studio_id: string
          validation_run_id: string
          waived_at: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          domain: string
          follow_up_task_id: string
          id?: string
          reason: string
          rule_code: string
          spec_id: string
          studio_id: string
          validation_run_id: string
          waived_at?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          domain?: string
          follow_up_task_id?: string
          id?: string
          reason?: string
          rule_code?: string
          spec_id?: string
          studio_id?: string
          validation_run_id?: string
          waived_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_waivers_follow_up_task_fk"
            columns: ["studio_id", "follow_up_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "validation_waivers_run_fk"
            columns: ["studio_id", "validation_run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "validation_waivers_spec_fk"
            columns: ["studio_id", "spec_id"]
            isOneToOne: false
            referencedRelation: "technical_specs"
            referencedColumns: ["studio_id", "id"]
          },
          {
            foreignKeyName: "validation_waivers_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_ai_artifact: {
        Args: {
          p_accepted_payload_checksum: unknown
          p_artifact_id: string
          p_command_receipts: Json
          p_decision_note: string
          p_expected_source_checksum: unknown
          p_operation_id: string
        }
        Returns: string
      }
      begin_public_cut_batch: {
        Args: {
          p_batch_id: string
          p_profile_id: string
          p_publications: Json
          p_studio_id: string
        }
        Returns: Json
      }
      commit_canonical_operation: {
        Args: {
          p_garment_id: string
          p_mutations: Json
          p_operation_id: string
          p_origin: string
          p_studio_id: string
        }
        Returns: Json
      }
      commit_canonical_restore: {
        Args: {
          p_dependency_json: Json
          p_expected_revision: number
          p_garment_id: string
          p_inverse_patch: Json
          p_label: string
          p_mutation_operation_id: string
          p_mutations: Json
          p_operation_id: string
          p_preview_checksum: unknown
          p_reason: string
          p_replay_patch: Json
          p_result_checksum: unknown
          p_result_snapshot: Json
          p_scope_json: Json
          p_selected_keys: Json
          p_source_version_id: string
          p_studio_id: string
        }
        Returns: Json
      }
      commit_public_cut_batch: { Args: { p_batch_id: string }; Returns: Json }
      commit_qc_waiver: {
        Args: {
          p_expected_revision: number
          p_operation_id: string
          p_qc_result_id: string
          p_task: Json
          p_waiver: Json
        }
        Returns: Json
      }
      commit_restore: {
        Args: {
          p_dependency_json: Json
          p_expected_revision: number
          p_garment_id: string
          p_inverse_patch: Json
          p_label: string
          p_operation_id: string
          p_preview_checksum: unknown
          p_reason: string
          p_replay_patch: Json
          p_result_checksum: unknown
          p_result_snapshot: Json
          p_scope_json: Json
          p_selected_keys: Json
          p_source_version_id: string
        }
        Returns: string
      }
      create_canonical_freeze_frame: {
        Args: {
          p_checksum: unknown
          p_expected_revision: number
          p_garment_id: string
          p_label: string
          p_notes: string
          p_operation_id: string
          p_scope_json: Json
          p_snapshot_json: Json
          p_version_kind?: string
        }
        Returns: Json
      }
      create_freeze_frame: {
        Args: {
          p_checksum: unknown
          p_expected_revision: number
          p_garment_id: string
          p_label: string
          p_notes: string
          p_operation_id: string
          p_scope_json: Json
          p_snapshot_json: Json
          p_version_kind?: string
        }
        Returns: string
      }
      decide_qc_inspection: {
        Args: {
          p_decision: string
          p_expected_revision: number
          p_inspection_id: string
          p_operation_id: string
        }
        Returns: Json
      }
      delete_freeze_frame: {
        Args: { p_expected_garment_revision: number; p_version_id: string }
        Returns: undefined
      }
      finalize_trusted_device_import: {
        Args: {
          p_confirmation: string
          p_garment_pins: Json
          p_spec_pins: Json
          p_studio_id: string
        }
        Returns: Json
      }
      publish_publication: {
        Args: { p_publication_id: string }
        Returns: undefined
      }
      record_ai_validation_candidate: {
        Args: { p_artifact_id: string; p_operation_id: string; p_run: Json }
        Returns: Json
      }
      record_editorial_export: {
        Args: {
          p_collection_id: string
          p_expected_revision: number
          p_export: Json
          p_operation_id: string
        }
        Returns: Json
      }
      record_tech_pack_export: {
        Args: {
          p_expected_spec_revision: number
          p_export: Json
          p_operation_id: string
          p_spec_id: string
        }
        Returns: Json
      }
      reject_ai_artifact: {
        Args: { p_artifact_id: string; p_decision_note: string }
        Returns: undefined
      }
      release_technical_spec: {
        Args: {
          p_expected_garment_revision: number
          p_expected_spec_revision: number
          p_operation_id: string
          p_release: Json
          p_spec_id: string
        }
        Returns: Json
      }
      stage_public_cut_asset: {
        Args: { p_asset: Json; p_batch_id: string; p_publication_id: string }
        Returns: string
      }
      transition_ai_job: {
        Args: {
          p_artifact?: Json
          p_error_code?: string
          p_expected_revision: number
          p_job_id: string
          p_status: string
        }
        Returns: Json
      }
      unpublish_public_cut_batch: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      unpublish_publication: {
        Args: { p_publication_id: string }
        Returns: undefined
      }
    }
    Enums: {
      ai_decision: "pending" | "accepted" | "rejected"
      measurement_unit: "mm" | "cm" | "in"
      membership_role: "owner" | "editor" | "reviewer" | "viewer"
      membership_status: "invited" | "active" | "suspended" | "removed"
      quantity_unit:
        | "mm"
        | "cm"
        | "m"
        | "in"
        | "yd"
        | "g"
        | "kg"
        | "oz"
        | "lb"
        | "each"
        | "pair"
        | "set"
        | "roll"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  ml_public: {
    Tables: {
      publication_assets: {
        Row: {
          alt_text: string | null
          checksum: string
          copied_from_checksum: string
          created_at: string
          height: number | null
          id: string
          mime_type: string
          publication_id: string
          rights_checked_at: string | null
          role: string
          size_bytes: number
          sort_order: number
          source_asset_id: string | null
          source_derivative_id: string | null
          storage_path: string
          studio_id: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          checksum: string
          copied_from_checksum: string
          created_at?: string
          height?: number | null
          id?: string
          mime_type: string
          publication_id: string
          rights_checked_at?: string | null
          role: string
          size_bytes: number
          sort_order?: number
          source_asset_id?: string | null
          source_derivative_id?: string | null
          storage_path: string
          studio_id: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          checksum?: string
          copied_from_checksum?: string
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string
          publication_id?: string
          rights_checked_at?: string | null
          role?: string
          size_bytes?: number
          sort_order?: number
          source_asset_id?: string | null
          source_derivative_id?: string | null
          storage_path?: string
          studio_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_assets_publication_fk"
            columns: ["studio_id", "publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["studio_id", "id"]
          },
        ]
      }
      publications: {
        Row: {
          batch_id: string | null
          checksum: string
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          is_public: boolean
          media_manifest: Json
          portfolio_editorial_collection_id: string | null
          portfolio_project_id: string | null
          profile_id: string
          public_path: string
          publication_type: Database["ml_public"]["Enums"]["publication_type"]
          published_at: string | null
          snapshot_json: Json
          source_id: string
          source_revision: number
          source_version_id: string | null
          studio_id: string
          unpublished_at: string | null
        }
        Insert: {
          batch_id?: string | null
          checksum: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          is_public?: boolean
          media_manifest?: Json
          portfolio_editorial_collection_id?: string | null
          portfolio_project_id?: string | null
          profile_id: string
          public_path: string
          publication_type: Database["ml_public"]["Enums"]["publication_type"]
          published_at?: string | null
          snapshot_json: Json
          source_id: string
          source_revision?: number
          source_version_id?: string | null
          studio_id: string
          unpublished_at?: string | null
        }
        Update: {
          batch_id?: string | null
          checksum?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          is_public?: boolean
          media_manifest?: Json
          portfolio_editorial_collection_id?: string | null
          portfolio_project_id?: string | null
          profile_id?: string
          public_path?: string
          publication_type?: Database["ml_public"]["Enums"]["publication_type"]
          published_at?: string | null
          snapshot_json?: Json
          source_id?: string
          source_revision?: number
          source_version_id?: string | null
          studio_id?: string
          unpublished_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      publication_type: "profile" | "project" | "editorial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      fabrics: {
        Row: {
          archive_status: string | null
          best_uses: string[]
          bin_number: string | null
          care_notes: string | null
          client_id: string
          color_family: string | null
          cost_per_yard: number | null
          created_at: string
          drape: string | null
          fabric_type: string | null
          fiber_content: string | null
          hand_feel: string | null
          id: string
          image_filename: string | null
          image_fit: string | null
          image_height: number | null
          image_mime_type: string | null
          image_path: string | null
          image_position_x: number | null
          image_position_y: number | null
          image_size_bytes: number | null
          image_width: number | null
          image_zoom: number | null
          lore_note: string | null
          metadata: Json
          mood_tags: string[]
          name: string
          opacity: string | null
          primary_color: string | null
          purchase_date: string | null
          rarity: string | null
          secondary_colors: string[]
          shelf: string | null
          storage_location: string | null
          storage_status: string | null
          stretch: string | null
          structure: string | null
          supplier: string | null
          texture: string | null
          updated_at: string
          user_id: string
          weave_or_knit: string | null
          weight: string | null
          width_inches: number | null
          yardage_total: number
        }
        Insert: {
          archive_status?: string | null
          best_uses?: string[]
          bin_number?: string | null
          care_notes?: string | null
          client_id: string
          color_family?: string | null
          cost_per_yard?: number | null
          created_at?: string
          drape?: string | null
          fabric_type?: string | null
          fiber_content?: string | null
          hand_feel?: string | null
          id?: string
          image_filename?: string | null
          image_fit?: string | null
          image_height?: number | null
          image_mime_type?: string | null
          image_path?: string | null
          image_position_x?: number | null
          image_position_y?: number | null
          image_size_bytes?: number | null
          image_width?: number | null
          image_zoom?: number | null
          lore_note?: string | null
          metadata?: Json
          mood_tags?: string[]
          name: string
          opacity?: string | null
          primary_color?: string | null
          purchase_date?: string | null
          rarity?: string | null
          secondary_colors?: string[]
          shelf?: string | null
          storage_location?: string | null
          storage_status?: string | null
          stretch?: string | null
          structure?: string | null
          supplier?: string | null
          texture?: string | null
          updated_at?: string
          user_id: string
          weave_or_knit?: string | null
          weight?: string | null
          width_inches?: number | null
          yardage_total?: number
        }
        Update: {
          archive_status?: string | null
          best_uses?: string[]
          bin_number?: string | null
          care_notes?: string | null
          client_id?: string
          color_family?: string | null
          cost_per_yard?: number | null
          created_at?: string
          drape?: string | null
          fabric_type?: string | null
          fiber_content?: string | null
          hand_feel?: string | null
          id?: string
          image_filename?: string | null
          image_fit?: string | null
          image_height?: number | null
          image_mime_type?: string | null
          image_path?: string | null
          image_position_x?: number | null
          image_position_y?: number | null
          image_size_bytes?: number | null
          image_width?: number | null
          image_zoom?: number | null
          lore_note?: string | null
          metadata?: Json
          mood_tags?: string[]
          name?: string
          opacity?: string | null
          primary_color?: string | null
          purchase_date?: string | null
          rarity?: string | null
          secondary_colors?: string[]
          shelf?: string | null
          storage_location?: string | null
          storage_status?: string | null
          stretch?: string | null
          structure?: string | null
          supplier?: string | null
          texture?: string | null
          updated_at?: string
          user_id?: string
          weave_or_knit?: string | null
          weight?: string | null
          width_inches?: number | null
          yardage_total?: number
        }
        Relationships: []
      }
      lookbook_pages: {
        Row: {
          client_id: string
          created_at: string
          data: Json
          id: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          data?: Json
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          data?: Json
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lookbook_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          client_id: string
          created_at: string
          fabric_id: string | null
          id: string
          material_name: string | null
          metadata: Json
          notes: string | null
          project_id: string
          role: string
          status: string | null
          updated_at: string
          user_id: string
          yardage_needed: number
          yardage_reserved: number
          yardage_used: number
        }
        Insert: {
          client_id: string
          created_at?: string
          fabric_id?: string | null
          id?: string
          material_name?: string | null
          metadata?: Json
          notes?: string | null
          project_id: string
          role: string
          status?: string | null
          updated_at?: string
          user_id: string
          yardage_needed?: number
          yardage_reserved?: number
          yardage_used?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          fabric_id?: string | null
          id?: string
          material_name?: string | null
          metadata?: Json
          notes?: string | null
          project_id?: string
          role?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          yardage_needed?: number
          yardage_reserved?: number
          yardage_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_fabric_id_fkey"
            columns: ["fabric_id"]
            isOneToOne: false
            referencedRelation: "fabrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          category: string
          client_id: string
          created_at: string
          id: string
          metadata: Json
          project_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          category: string
          client_id: string
          created_at?: string
          id?: string
          metadata?: Json
          project_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          client_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          project_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_profiles: {
        Row: {
          avatar_image_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          email: string | null
          headline: string | null
          id: string
          is_public: boolean
          location: string | null
          resume_url: string | null
          snapshot: Json | null
          updated_at: string
          user_id: string
          username_slug: string
        }
        Insert: {
          avatar_image_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          headline?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          resume_url?: string | null
          snapshot?: Json | null
          updated_at?: string
          user_id: string
          username_slug: string
        }
        Update: {
          avatar_image_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          headline?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          resume_url?: string | null
          snapshot?: Json | null
          updated_at?: string
          user_id?: string
          username_slug?: string
        }
        Relationships: []
      }
      portfolio_publications: {
        Row: {
          published_at: string
          snapshot: Json
          updated_at: string
          user_id: string
          username_slug: string
        }
        Insert: {
          published_at?: string
          snapshot?: Json
          updated_at?: string
          user_id: string
          username_slug: string
        }
        Update: {
          published_at?: string
          snapshot?: Json
          updated_at?: string
          user_id?: string
          username_slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cloud_migration_completed_at: string | null
          created_at: string
          display_name: string | null
          id: string
          portfolio_profile: Json
          studio_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cloud_migration_completed_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          portfolio_profile?: Json
          studio_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cloud_migration_completed_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          portfolio_profile?: Json
          studio_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_images: {
        Row: {
          alt_text: string | null
          client_id: string
          created_at: string
          display_order: number
          filename: string | null
          fit: string
          height: number | null
          id: string
          metadata: Json
          mime_type: string | null
          position_x: number
          position_y: number
          project_id: string
          size_bytes: number | null
          slot_type: string
          storage_path: string | null
          updated_at: string
          user_id: string
          width: number | null
          zoom: number
        }
        Insert: {
          alt_text?: string | null
          client_id: string
          created_at?: string
          display_order?: number
          filename?: string | null
          fit?: string
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          position_x?: number
          position_y?: number
          project_id: string
          size_bytes?: number | null
          slot_type: string
          storage_path?: string | null
          updated_at?: string
          user_id: string
          width?: number | null
          zoom?: number
        }
        Update: {
          alt_text?: string | null
          client_id?: string
          created_at?: string
          display_order?: number
          filename?: string | null
          fit?: string
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          position_x?: number
          position_y?: number
          project_id?: string
          size_bytes?: number | null
          slot_type?: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string
          width?: number | null
          zoom?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          collection_name: string | null
          color_story: string | null
          created_at: string
          description: string | null
          design_intent: string | null
          difficulty: string | null
          due_date: string | null
          garment_type: string | null
          general_notes: string | null
          id: string
          key_features: string[]
          metadata: Json
          priority: string | null
          progress: number
          season: string | null
          silhouette: string | null
          start_date: string | null
          status: string | null
          target_wearer: string | null
          title: string
          updated_at: string
          user_id: string
          workflow_phase: string | null
        }
        Insert: {
          client_id: string
          collection_name?: string | null
          color_story?: string | null
          created_at?: string
          description?: string | null
          design_intent?: string | null
          difficulty?: string | null
          due_date?: string | null
          garment_type?: string | null
          general_notes?: string | null
          id?: string
          key_features?: string[]
          metadata?: Json
          priority?: string | null
          progress?: number
          season?: string | null
          silhouette?: string | null
          start_date?: string | null
          status?: string | null
          target_wearer?: string | null
          title: string
          updated_at?: string
          user_id: string
          workflow_phase?: string | null
        }
        Update: {
          client_id?: string
          collection_name?: string | null
          color_story?: string | null
          created_at?: string
          description?: string | null
          design_intent?: string | null
          difficulty?: string | null
          due_date?: string | null
          garment_type?: string | null
          general_notes?: string | null
          id?: string
          key_features?: string[]
          metadata?: Json
          priority?: string | null
          progress?: number
          season?: string | null
          silhouette?: string | null
          start_date?: string | null
          status?: string | null
          target_wearer?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          workflow_phase?: string | null
        }
        Relationships: []
      }
      published_editorials: {
        Row: {
          created_at: string
          editorial_id: string
          editorial_slug: string
          id: string
          is_public: boolean
          snapshot: Json
          title: string
          updated_at: string
          user_id: string
          username_slug: string
        }
        Insert: {
          created_at?: string
          editorial_id: string
          editorial_slug: string
          id?: string
          is_public?: boolean
          snapshot?: Json
          title: string
          updated_at?: string
          user_id: string
          username_slug: string
        }
        Update: {
          created_at?: string
          editorial_id?: string
          editorial_slug?: string
          id?: string
          is_public?: boolean
          snapshot?: Json
          title?: string
          updated_at?: string
          user_id?: string
          username_slug?: string
        }
        Relationships: []
      }
      published_portfolio_projects: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          project_id: string
          project_slug: string
          snapshot: Json
          title: string
          updated_at: string
          user_id: string
          username_slug: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          project_id: string
          project_slug: string
          snapshot?: Json
          title: string
          updated_at?: string
          user_id: string
          username_slug: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          project_id?: string
          project_slug?: string
          snapshot?: Json
          title?: string
          updated_at?: string
          user_id?: string
          username_slug?: string
        }
        Relationships: []
      }
      sync_tombstones: {
        Row: {
          client_id: string
          created_at: string
          deleted_at: string
          entity: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deleted_at?: string
          entity: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deleted_at?: string
          entity?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          material_id: string | null
          metadata: Json
          notes: string | null
          priority: string | null
          project_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          material_id?: string | null
          metadata?: Json
          notes?: string | null
          priority?: string | null
          project_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          material_id?: string | null
          metadata?: Json
          notes?: string | null
          priority?: string | null
          project_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      yardage_entries: {
        Row: {
          client_id: string
          created_at: string
          entry_type: string
          fabric_id: string
          id: string
          material_id: string | null
          metadata: Json
          notes: string | null
          occurred_at: string
          project_id: string | null
          updated_at: string
          user_id: string
          yardage: number
        }
        Insert: {
          client_id: string
          created_at?: string
          entry_type: string
          fabric_id: string
          id?: string
          material_id?: string | null
          metadata?: Json
          notes?: string | null
          occurred_at?: string
          project_id?: string | null
          updated_at?: string
          user_id: string
          yardage: number
        }
        Update: {
          client_id?: string
          created_at?: string
          entry_type?: string
          fabric_id?: string
          id?: string
          material_id?: string | null
          metadata?: Json
          notes?: string | null
          occurred_at?: string
          project_id?: string | null
          updated_at?: string
          user_id?: string
          yardage?: number
        }
        Relationships: [
          {
            foreignKeyName: "yardage_entries_fabric_id_fkey"
            columns: ["fabric_id"]
            isOneToOne: false
            referencedRelation: "fabrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yardage_entries_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yardage_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_fabric_image_if_matches: {
        Args: {
          p_fabric_client_id: string
          p_image_client_id: string
          p_storage_path: string
        }
        Returns: boolean
      }
      record_sync_tombstone: {
        Args: { p_client_id: string; p_deleted_at: string; p_entity: string }
        Returns: undefined
      }
      sync_entity_for_table: { Args: { table_name: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  ml_private: {
    Enums: {
      ai_decision: ["pending", "accepted", "rejected"],
      measurement_unit: ["mm", "cm", "in"],
      membership_role: ["owner", "editor", "reviewer", "viewer"],
      membership_status: ["invited", "active", "suspended", "removed"],
      quantity_unit: [
        "mm",
        "cm",
        "m",
        "in",
        "yd",
        "g",
        "kg",
        "oz",
        "lb",
        "each",
        "pair",
        "set",
        "roll",
      ],
    },
  },
  ml_public: {
    Enums: {
      publication_type: ["profile", "project", "editorial"],
    },
  },
  public: {
    Enums: {},
  },
} as const

