-- Inspiration uploads are committed atomically with their media asset. Older
-- clients may place the relationship row before the media row in the mutation
-- array, so defer this FK until the transaction has applied the full group.
-- The delete behavior and canonical relationship remain unchanged.
alter table ml_private.inspiration_items
  alter constraint inspiration_items_asset_fk deferrable initially deferred;
