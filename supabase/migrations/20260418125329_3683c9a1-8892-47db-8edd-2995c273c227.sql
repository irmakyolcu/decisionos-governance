
CREATE OR REPLACE FUNCTION public.prevent_approved_decision_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'Approved' AND NEW.status = OLD.status THEN
    RAISE EXCEPTION 'Approved decisions are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_workspace_seed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_workspace_demo_data(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;
