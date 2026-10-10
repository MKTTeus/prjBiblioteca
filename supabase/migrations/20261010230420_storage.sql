-- O schema storage existe no Supabase; é opcional no PostgreSQL dos testes.
DO $$ BEGIN
 IF to_regclass('storage.buckets') IS NOT NULL THEN
   INSERT INTO storage.buckets(id,name,public,file_size_limit) VALUES('backups','backups',false,52428800),('capas','capas',true,8388608)
   ON CONFLICT(id) DO UPDATE SET public=excluded.public,file_size_limit=excluded.file_size_limit;
 END IF;
 IF to_regclass('storage.objects') IS NOT NULL THEN
   DROP POLICY IF EXISTS biblioteca_proteger_backups ON storage.objects;
   CREATE POLICY biblioteca_proteger_backups ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated USING(bucket_id<>'backups') WITH CHECK(bucket_id<>'backups');
   DROP POLICY IF EXISTS biblioteca_capas_insert ON storage.objects;
   CREATE POLICY biblioteca_capas_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(bucket_id<>'capas');
   DROP POLICY IF EXISTS biblioteca_capas_update ON storage.objects;
   CREATE POLICY biblioteca_capas_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(bucket_id<>'capas') WITH CHECK(bucket_id<>'capas');
   DROP POLICY IF EXISTS biblioteca_capas_delete ON storage.objects;
   CREATE POLICY biblioteca_capas_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(bucket_id<>'capas');
 END IF;
END $$;
