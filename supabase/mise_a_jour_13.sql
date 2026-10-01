-- =========================================================================
-- SANTÉ-CI — Mise à jour n°13
-- À exécuter une seule fois dans le SQL Editor Supabase (après la n°12).
-- =========================================================================

-- -------------------------------------------------------------------------
-- "Accepter/Refuser" une demande de collaboration ne faisait rien.
-- La policy RLS "Destinataire repond" ne précisait qu'un USING, sans
-- WITH CHECK explicite — Postgres réutilise alors le USING comme WITH
-- CHECK par défaut, qui exige "statut = 'en_attente'". Or la mise à jour
-- change justement le statut vers 'acceptee'/'refusee' : la nouvelle ligne
-- ne satisfait plus cette condition, donc l'update est silencieusement
-- rejeté par RLS (0 ligne modifiée, sans erreur levée côté client car le
-- code n'en vérifiait pas). On sépare clairement les deux conditions :
-- l'ancienne ligne doit être 'en_attente' (on ne répond qu'une fois), mais
-- la nouvelle ligne n'a pas cette contrainte.
-- -------------------------------------------------------------------------
drop policy if exists "Destinataire repond" on public.destinataires_collaboration;
create policy "Destinataire repond" on public.destinataires_collaboration
  for update
  using (professionnel_id = auth.uid() and statut = 'en_attente')
  with check (professionnel_id = auth.uid());

-- -------------------------------------------------------------------------
-- Une fois l'acceptation corrigée, on complète aussi resoudre_collaboration
-- (appelée quand le demandeur choisit le confrère retenu) pour que ses
-- notifications utilisent "lien"/"entite_id" comme le reste de l'app.
-- -------------------------------------------------------------------------
create or replace function public.resoudre_collaboration(p_demande_id uuid, p_professionnel_retenu_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demandeur_id uuid;
begin
  select demandeur_id into v_demandeur_id from public.demandes_collaboration where id = p_demande_id;

  if v_demandeur_id is null then
    raise exception 'Demande introuvable';
  end if;
  if v_demandeur_id <> auth.uid() then
    raise exception 'Non autorisé';
  end if;

  update public.demandes_collaboration
  set statut = 'resolue', professionnel_retenu_id = p_professionnel_retenu_id
  where id = p_demande_id;

  update public.destinataires_collaboration
  set statut = 'ignoree_resolue', repondu_le = now()
  where demande_id = p_demande_id and professionnel_id <> p_professionnel_retenu_id
    and statut <> 'ignoree_resolue';

  insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
  select professionnel_id, 'confirmation_rdv', 'Demande déjà résolue',
         'Cette demande de collaboration a été résolue avec un autre confrère. Merci pour votre disponibilité.',
         '/professionnel/collaborations', p_demande_id
  from public.destinataires_collaboration
  where demande_id = p_demande_id and professionnel_id <> p_professionnel_retenu_id;

  insert into public.conversations_collaboration (demande_id, professionnel_a_id, professionnel_b_id)
  values (p_demande_id, v_demandeur_id, p_professionnel_retenu_id)
  on conflict (demande_id) do nothing;

  insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
  values (p_professionnel_retenu_id, 'confirmation_rdv', 'Collaboration confirmée',
          'Un confrère continue avec vous sur sa demande de collaboration. Consultez la messagerie confrères.',
          '/professionnel/collaborations', p_demande_id);
end;
$$;

grant execute on function public.resoudre_collaboration(uuid, uuid) to authenticated;

-- =========================================================================
-- FIN DE LA MISE À JOUR N°13
-- =========================================================================
