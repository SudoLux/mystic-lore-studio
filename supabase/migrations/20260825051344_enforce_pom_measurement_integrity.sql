begin;

alter table ml_private.pom_points
  add constraint pom_points_name_not_blank_check check (btrim(name) <> ''),
  add constraint pom_points_method_not_blank_check check (btrim(method) <> ''),
  add constraint pom_points_normalized_anchor_check check (
    jsonb_typeof(diagram_anchor_json -> 'x') = 'number'
    and jsonb_typeof(diagram_anchor_json -> 'y') = 'number'
    and (diagram_anchor_json ->> 'x')::numeric between 0 and 1
    and (diagram_anchor_json ->> 'y')::numeric between 0 and 1
  );

alter table ml_private.measurement_sets
  add constraint measurement_sets_name_not_blank_check check (btrim(name) <> ''),
  add constraint measurement_sets_base_size_not_blank_check check (btrim(base_size) <> '');

alter table ml_private.measurement_values
  add constraint measurement_values_size_not_blank_check check (btrim(size) <> ''),
  add constraint measurement_values_target_nonnegative_check check (target >= 0);

alter table ml_private.grade_rule_values
  add constraint grade_rule_values_sizes_not_blank_check check (
    btrim(from_size) <> '' and btrim(to_size) <> ''
  );

alter table ml_private.fit_measurements
  add constraint fit_measurements_size_not_blank_check check (btrim(size) <> ''),
  add constraint fit_measurements_actual_nonnegative_check check (actual >= 0);

create index ml_measurement_values_pom_size_idx
  on ml_private.measurement_values (studio_id, pom_point_id, size, set_id);
create index ml_grade_values_pom_idx
  on ml_private.grade_rule_values (studio_id, pom_point_id, grade_rule_id);
create index ml_fit_measurements_pom_size_idx
  on ml_private.fit_measurements (studio_id, pom_point_id, size, sample_round_id);

comment on constraint pom_points_normalized_anchor_check on ml_private.pom_points is
  'POM anchors are durable normalized coordinates; UI canvas pixels are never the source of truth.';
comment on column ml_private.technical_specs.unit is
  'Canonical storage unit for every POM target, tolerance, grade delta, and fit actual in the specification.';

commit;
