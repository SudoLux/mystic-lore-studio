begin;

alter table ml_private.flat_annotations
  add column severity text not null default 'info',
  add column status text not null default 'open',
  add constraint flat_annotations_severity_check
    check (severity in ('info', 'warning', 'critical')),
  add constraint flat_annotations_status_check
    check (status in ('open', 'resolved', 'dismissed'));

create index flat_annotations_open_critical_idx
  on ml_private.flat_annotations (studio_id, flat_id)
  where severity = 'critical' and status = 'open';

alter table ml_private.technical_templates
  drop constraint technical_templates_template_type_check,
  add constraint technical_templates_template_type_check
    check (template_type in ('pom', 'measurement', 'grading', 'bom', 'construction', 'validation', 'tech_pack'));

alter table ml_private.tech_pack_exports
  add column template_id uuid not null,
  add column template_version integer not null check (template_version > 0),
  add column source_revision_label text not null,
  add column deterministic_filename text not null
    check (deterministic_filename ~ '^[A-Za-z0-9][A-Za-z0-9._-]+\.(pdf|zip)$'),
  add constraint tech_pack_exports_template_fk foreign key (studio_id, template_id)
    references ml_private.technical_templates(studio_id, id) on delete restrict;

create index tech_pack_exports_template_idx
  on ml_private.tech_pack_exports (studio_id, template_id);

comment on column ml_private.flat_annotations.severity is
  'Workflow severity remains structured independently from the rendered flat canvas.';
comment on column ml_private.flat_annotations.status is
  'Resolution state used by flat approval and export-readiness validation.';
comment on column ml_private.tech_pack_exports.deterministic_filename is
  'Reproducible filename derived from garment, source version, template version, format, and checksum.';

commit;
