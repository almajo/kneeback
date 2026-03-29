// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_white_nocturne.sql';
import m0001 from './0001_powerful_songbird.sql';
import m0002 from './0002_unique_user_exercises_exercise_id.sql';
import m0003 from './0003_unify_schema_with_supabase.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
  },
};
