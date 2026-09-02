begin;

-- The size range is a garment-specification attribute. Keeping it on the
-- existing technical spec makes it available to measurements and grading
-- without introducing another size-configuration domain.
alter table ml_private.technical_specs
  add column if not exists size_system text not null default 'custom'
    check (size_system in ('alpha', 'numeric', 'custom')),
  add column if not exists size_range_json jsonb not null default '["M"]'::jsonb
    check (jsonb_typeof(size_range_json) = 'array' and jsonb_array_length(size_range_json) > 0);

update ml_private.technical_specs
set size_range_json = jsonb_build_array(base_size)
where jsonb_typeof(size_range_json) <> 'array' or jsonb_array_length(size_range_json) = 0;

comment on column ml_private.technical_specs.size_system is
  'Presentation and grading size system for this garment technical specification.';
comment on column ml_private.technical_specs.size_range_json is
  'Ordered canonical garment sizes used by measurement and grading views.';

-- Canonical browser operations use this narrow allowlist. These fields remain
-- protected by the existing operation transport, revision checks, and RLS.
create or replace function ml_internal.canonical_client_columns(p_table_name text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_table_name
    when 'collections' then array['name','season','status','sort_order','archived_at']
    when 'garments' then array['collection_id','garment_code','title','garment_type','status','phase','archived_at']
    when 'suppliers' then array['name','supplier_type','contact_name','contact_email','phone','website','status','default_lead_time_days','archived_at','capabilities_json','minimum_order_quantity']
    when 'factories' then array['name','capabilities_json','minimum_order_quantity','lead_time_days','status','archived_at','supplier_id','contact_name','contact_email','phone']
    when 'design_briefs' then array['garment_id','intent','target_wearer','silhouette','color_story','key_features']
    when 'inspiration_boards' then array['garment_id','title','layout_json','sort_order']
    when 'inspiration_items' then array['board_id','asset_id','caption','position_json','sort_order']
    when 'media_assets' then array['storage_path','original_filename','mime_type','size_bytes','checksum','rights_json','width','height','duration_ms']
    when 'garment_media' then array['garment_id','asset_id','role','sort_order','framing_json']
    when 'media_derivatives' then array['source_asset_id','variant','storage_path','mime_type','size_bytes','checksum','width','height']
    when 'design_annotations' then array['garment_id','asset_id','anchor_json','body','status']
    when 'materials' then array['material_code','name','category','composition','status','archived_at']
    when 'material_variants' then array['material_id','color_name','color_hex','width','width_unit','weight_gsm','sku','status']
    when 'material_variant_profiles' then array['variant_id','country_of_origin','secondary_colors','weave_or_knit','stretch','opacity','drape','hand_feel','texture','structure','rarity','best_uses','care_notes','mood_tags','lore_note','private_notes','purchase_date','storage_location','bin_number','shelf','storage_status']
    when 'material_variant_media' then array['variant_id','asset_id','role','sort_order','framing_json']
    when 'inventory_entries' then array['variant_id','entry_type','quantity','unit','occurred_at','note']
    when 'garment_materials' then array['garment_id','variant_id','role','placement','required_quantity','reserved_quantity','unit','status']
    when 'components' then array['component_code','name','category','spec_json','status','archived_at']
    when 'component_variants' then array['component_id','finish','size','color','sku','status']
    when 'garment_components' then array['garment_id','variant_id','placement','quantity','unit','status']
    when 'supplier_items' then array['supplier_id','item_type','material_variant_id','component_variant_id','sku','currency','unit_cost','purchase_unit','minimum_order_quantity','lead_time_days','is_preferred']
    when 'technical_specs' then array['garment_id','status','base_size','unit','revision_label','size_system','size_range_json']
    when 'technical_flats' then array['spec_id','view','asset_id','source','approved_at','sort_order']
    when 'flat_annotations' then array['flat_id','anchor_json','label','detail','sort_order','severity','status']
    when 'technical_files' then array['spec_id','asset_id','file_type','version_label','is_source']
    when 'pom_points' then array['spec_id','code','name','method','diagram_anchor_json','sort_order']
    when 'measurement_sets' then array['spec_id','name','sample_type','base_size','status']
    when 'measurement_values' then array['set_id','pom_point_id','size','target','tolerance_plus','tolerance_minus']
    when 'grade_rules' then array['spec_id','name','size_range_json','status']
    when 'grade_rule_values' then array['grade_rule_id','pom_point_id','from_size','to_size','delta']
    when 'fit_measurements' then array['sample_round_id','pom_point_id','size','actual','variance','fit_session_id','garment_version_id']
    when 'bom_items' then array['spec_id','item_type','material_variant_id','component_variant_id','description','quantity','unit','placement','sort_order','intentional_free_text','supplier_item_id','substitute_item_id','status','shortage_quantity','unit_cost','currency','cost_impact']
    when 'construction_sections' then array['spec_id','name','sort_order','status']
    when 'construction_steps' then array['section_id','step_number','operation','machine','stitch_spec','seam_allowance','sort_order','machine_required','stitch_required','status']
    when 'construction_details' then array['step_id','asset_id','anchor_json','callout','severity','sort_order','status']
    when 'technical_templates' then array['template_type','name','payload_json','version','status']
    when 'sample_rounds' then array['garment_id','factory_id','garment_version_id','round_no','sample_type','status','received_at','requested_at','notes']
    when 'sample_round_media' then array['sample_round_id','asset_id','role','capture_status','captured_at','retry_count','sort_order']
    when 'fit_sessions' then array['sample_round_id','fit_date','model_profile_json','summary','decision','garment_version_id','status','decision_note']
    when 'fit_session_media' then array['fit_session_id','asset_id','role','capture_status','captured_at','retry_count','sort_order']
    when 'fit_issues' then array['fit_session_id','area','severity','observation','resolution','status','garment_version_id','pom_point_id','owner_task_id']
    when 'fit_issue_promotions' then array['fit_issue_id','garment_id','garment_version_id','promotion_type','status','task_id','pom_point_id','construction_detail_id','note','candidate_json','resolved_at']
    when 'cost_sheets' then array['garment_id','garment_version_id','currency','quantity_basis','status','calculated_total','name','cogs_per_unit','wholesale_unit_price','margin_pct','approved_at']
    when 'cost_items' then array['cost_sheet_id','category','description','quantity','unit_cost','waste_pct','total','sort_order','basis','currency','bom_item_id','material_variant_id','component_variant_id']
    when 'production_orders' then array['garment_id','garment_version_id','factory_id','order_code','quantity','status','target_ship_date','cost_sheet_id','target_start_date','target_delivery_date','approved_at','placed_at']
    when 'production_milestones' then array['production_order_id','name','owner_id','target_date','completed_at','status','sort_order']
    when 'qc_templates' then array['name','version','status']
    when 'qc_template_checks' then array['template_id','check_code','name','description','method','severity','required','sort_order']
    when 'qc_inspections' then array['production_order_id','garment_version_id','template_id','template_version','status','inspected_at']
    when 'qc_results' then array['production_order_id','check_code','result','severity','notes','inspected_at','inspection_id','template_check_id','evidence_asset_id','issue_task_id']
    when 'qc_waivers' then '{}'::text[]
    when 'editorial_collections' then array['garment_id','title','template_type','theme_id','status','subtitle','description','primary_garment_version_id','transition_json','export_settings_json','approved_at','published_at']
    when 'editorial_collection_garments' then array['collection_id','garment_id','role','sort_order']
    when 'editorial_scenes' then array['collection_id','scene_type','title','sort_order','transition_json','subtitle','description','narrative_role','background_json']
    when 'editorial_blocks' then array['scene_id','block_type','content_json','settings_json','sort_order','live_source','source_garment_id','source_version_id','source_entity_id','source_field_path','source_checksum','staleness','ai_artifact_id']
    when 'editorial_assets' then array['collection_id','asset_id','role','usage_json','sort_order']
    when 'portfolio_profiles' then array['username_slug','headline','bio','status','archived_at','display_name','location','public_email','resume_public_url','avatar_asset_id']
    when 'portfolio_projects' then array['profile_id','garment_id','slug','case_study_json','visibility','sort_order','archived_at','source_version_id','featured','include_technical_excerpt']
    when 'portfolio_project_assets' then array['portfolio_project_id','asset_id','role','alt_text','sort_order']
    when 'portfolio_editorials' then array['profile_id','collection_id','slug','visibility','sort_order','source_version_id']
    when 'portfolio_editorial_scenes' then array['profile_id','collection_id','scene_id','sort_order']
    when 'portfolio_editorial_assets' then array['profile_id','collection_id','asset_id','role','alt_text','sort_order']
    when 'portfolio_technical_excerpts' then array['profile_id','portfolio_project_id','garment_version_id','title','summary','public_download_asset_id','visible','approved_at']
    when 'tasks' then array['garment_id','title','description','status','priority','due_at','assignee_id','sort_order']
    when 'calendar_events' then array['garment_id','event_type','title','notes','starts_at','ends_at','assignee_id']
    when 'ai_jobs' then array['garment_id','job_type','model','prompt_version','input_refs_json','provider','idempotency_key','source_checksum','retry_of_job_id','attempt_no']
    when 'ai_job_input_refs' then array['ai_job_id','entity_type','entity_id','entity_revision','source_version_id','field_path','source_checksum','sort_order']
    else '{}'::text[]
  end;
$$;

commit;
