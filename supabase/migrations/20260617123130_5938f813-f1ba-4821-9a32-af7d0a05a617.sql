
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_writer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_workspace_id(uuid) TO authenticated;
