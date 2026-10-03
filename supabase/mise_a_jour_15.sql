-- =========================================================================
-- SANTÉ-CI — Mise à jour n°15
-- À exécuter une seule fois dans le SQL Editor Supabase (après la n°14).
-- =========================================================================

-- -------------------------------------------------------------------------
-- Les alertes qui "viennent souvent pas" (il faut rafraîchir la page pour
-- les voir apparaître) : cause la plus probable, Supabase n'active PAS le
-- temps réel automatiquement sur une table — il faut l'ajouter à la
-- publication "supabase_realtime" explicitement — sans ça, la cloche (et
-- les badges) ne se mettent à jour qu'au chargement de la page, jamais en
-- direct, même si le code applicatif écoute correctement les événements.
--
-- Chaque ADD est protégé : si la table est déjà dans la publication,
-- l'erreur est ignorée plutôt que de faire échouer toute la migration.
-- -------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.messages_labo;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.messages_collaboration;
  exception when duplicate_object then null;
  end;
end $$;

-- Vérification : doit maintenant lister notifications, messages,
-- messages_labo, messages_collaboration.
select tablename from pg_publication_tables where pubname = 'supabase_realtime';

-- =========================================================================
-- FIN DE LA MISE À JOUR N°15
-- =========================================================================
