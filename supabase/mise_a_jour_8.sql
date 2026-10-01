-- =========================================================================
-- SANTÉ-CI — Mise à jour n°8
-- Comble deux oublis : notification au destinataire d'une nouvelle demande
-- de collaboration, et notification au demandeur quand un confrère répond.
-- =========================================================================

create or replace function public.notifier_nouvelle_demande_collaboration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (destinataire_id, type, titre, contenu)
  values (new.professionnel_id, 'confirmation_rdv', 'Un confrère a besoin de vous',
          'Une demande de collaboration vous a été envoyée. Consultez "Mes collaborations".');
  return new;
end;
$$;

drop trigger if exists trg_notifier_nouvelle_demande_collaboration on public.destinataires_collaboration;
create trigger trg_notifier_nouvelle_demande_collaboration
after insert on public.destinataires_collaboration
for each row execute function public.notifier_nouvelle_demande_collaboration();

create or replace function public.notifier_reponse_collaboration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demandeur_id uuid;
  v_nom_pro text;
begin
  if new.statut = old.statut then
    return new;
  end if;
  if new.statut not in ('acceptee', 'refusee') then
    return new;
  end if;

  select demandeur_id into v_demandeur_id from public.demandes_collaboration where id = new.demande_id;
  select prenom || ' ' || nom into v_nom_pro from public.professionnels where id = new.professionnel_id;

  insert into public.notifications (destinataire_id, type, titre, contenu)
  values (
    v_demandeur_id,
    'confirmation_rdv',
    case when new.statut = 'acceptee' then 'Un confrère a accepté' else 'Un confrère a refusé' end,
    'Dr ' || v_nom_pro || case when new.statut = 'acceptee' then ' a accepté votre demande de collaboration.' else ' ne peut pas donner suite à votre demande.' end
  );
  return new;
end;
$$;

drop trigger if exists trg_notifier_reponse_collaboration on public.destinataires_collaboration;
create trigger trg_notifier_reponse_collaboration
after update on public.destinataires_collaboration
for each row execute function public.notifier_reponse_collaboration();

-- =========================================================================
-- FIN DE LA MISE À JOUR N°8
-- =========================================================================
