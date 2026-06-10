export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      athlete_teams: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          league_id: string
          season_end: number | null
          season_start: number
          team_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          league_id: string
          season_end?: number | null
          season_start: number
          team_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          league_id?: string
          season_end?: number | null
          season_start?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_teams_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          created_at: string
          external_ids: Json
          headshot_url: string | null
          id: string
          is_active: boolean
          name: string
          sport: Database["public"]["Enums"]["sport_type"] | null
        }
        Insert: {
          created_at?: string
          external_ids?: Json
          headshot_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          sport?: Database["public"]["Enums"]["sport_type"] | null
        }
        Update: {
          created_at?: string
          external_ids?: Json
          headshot_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sport?: Database["public"]["Enums"]["sport_type"] | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          is_legacy: boolean
          item_count_at_completion: number
          list_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          is_legacy?: boolean
          item_count_at_completion: number
          list_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          is_legacy?: boolean
          item_count_at_completion?: number
          list_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          event_log_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          event_log_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          event_log_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_event_log_id_fkey"
            columns: ["event_log_id"]
            isOneToOne: false
            referencedRelation: "event_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_tags: {
        Row: {
          created_at: string
          display_name: string
          event_log_id: string
          id: string
          tagged_user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          event_log_id: string
          id?: string
          tagged_user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          event_log_id?: string
          id?: string
          tagged_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companion_tags_event_log_id_fkey"
            columns: ["event_log_id"]
            isOneToOne: false
            referencedRelation: "event_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companion_tags_tagged_user_id_fkey"
            columns: ["tagged_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_athletes: {
        Row: {
          athlete_id: string
          created_at: string
          event_id: string
          finish_position: number | null
          id: string
          is_winner: boolean | null
          stat_line: string | null
          team_id: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          event_id: string
          finish_position?: number | null
          id?: string
          is_winner?: boolean | null
          stat_line?: string | null
          team_id?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          event_id?: string
          finish_position?: number | null
          id?: string
          is_winner?: boolean | null
          stat_line?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_athletes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_athletes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_athletes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_logs: {
        Row: {
          comment_count: number
          comments_enabled: boolean
          created_at: string
          event_date: string
          event_id: string | null
          id: string
          is_manual: boolean
          is_neutral: boolean
          league_id: string | null
          like_count: number
          manual_description: string | null
          manual_title: string | null
          notes: string | null
          outcome: Database["public"]["Enums"]["outcome_type"] | null
          photo_capture_method: string | null
          photo_captured_at: string | null
          photo_is_verified: boolean
          photo_like_count: number
          photo_url: string | null
          privacy: Database["public"]["Enums"]["privacy_tier"]
          rating: number | null
          rooting_athlete_id: string | null
          rooting_team_id: string | null
          seat_location: string | null
          sport: Database["public"]["Enums"]["sport_type"] | null
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          comment_count?: number
          comments_enabled?: boolean
          created_at?: string
          event_date: string
          event_id?: string | null
          id?: string
          is_manual?: boolean
          is_neutral?: boolean
          league_id?: string | null
          like_count?: number
          manual_description?: string | null
          manual_title?: string | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["outcome_type"] | null
          photo_capture_method?: string | null
          photo_captured_at?: string | null
          photo_is_verified?: boolean
          photo_like_count?: number
          photo_url?: string | null
          privacy?: Database["public"]["Enums"]["privacy_tier"]
          rating?: number | null
          rooting_athlete_id?: string | null
          rooting_team_id?: string | null
          seat_location?: string | null
          sport?: Database["public"]["Enums"]["sport_type"] | null
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          comment_count?: number
          comments_enabled?: boolean
          created_at?: string
          event_date?: string
          event_id?: string | null
          id?: string
          is_manual?: boolean
          is_neutral?: boolean
          league_id?: string | null
          like_count?: number
          manual_description?: string | null
          manual_title?: string | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["outcome_type"] | null
          photo_capture_method?: string | null
          photo_captured_at?: string | null
          photo_is_verified?: boolean
          photo_like_count?: number
          photo_url?: string | null
          privacy?: Database["public"]["Enums"]["privacy_tier"]
          rating?: number | null
          rooting_athlete_id?: string | null
          rooting_team_id?: string | null
          seat_location?: string | null
          sport?: Database["public"]["Enums"]["sport_type"] | null
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_rooting_athlete_id_fkey"
            columns: ["rooting_athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_rooting_team_id_fkey"
            columns: ["rooting_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rosters: {
        Row: {
          athlete_id: string
          created_at: string
          event_id: string
          id: string
          is_notable: boolean | null
          stat_line: string | null
          team_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          event_id: string
          id?: string
          is_notable?: boolean | null
          stat_line?: string | null
          team_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          event_id?: string
          id?: string
          is_notable?: boolean | null
          stat_line?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rosters_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rosters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          away_score: number | null
          away_team_id: string | null
          cover_photo_event_log_id: string | null
          cover_photo_url: string | null
          created_at: string
          day_number: number | null
          event_date: string
          event_tags: string[] | null
          event_template: Database["public"]["Enums"]["event_template"]
          external_ids: Json
          headline: string | null
          home_score: number | null
          home_team_id: string | null
          id: string
          is_draw: boolean | null
          is_postseason: boolean
          league_id: string
          round_or_stage: string | null
          season: number
          tournament_id: string | null
          tournament_name: string | null
          updated_at: string
          venue_id: string
          venue_name_at_time: string | null
          voting_closes_at: string | null
          winner_name: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_id?: string | null
          cover_photo_event_log_id?: string | null
          cover_photo_url?: string | null
          created_at?: string
          day_number?: number | null
          event_date: string
          event_tags?: string[] | null
          event_template: Database["public"]["Enums"]["event_template"]
          external_ids?: Json
          headline?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          is_draw?: boolean | null
          is_postseason?: boolean
          league_id: string
          round_or_stage?: string | null
          season: number
          tournament_id?: string | null
          tournament_name?: string | null
          updated_at?: string
          venue_id: string
          venue_name_at_time?: string | null
          voting_closes_at?: string | null
          winner_name?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string | null
          cover_photo_event_log_id?: string | null
          cover_photo_url?: string | null
          created_at?: string
          day_number?: number | null
          event_date?: string
          event_tags?: string[] | null
          event_template?: Database["public"]["Enums"]["event_template"]
          external_ids?: Json
          headline?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          is_draw?: boolean | null
          is_postseason?: boolean
          league_id?: string
          round_or_stage?: string | null
          season?: number
          tournament_id?: string | null
          tournament_name?: string | null
          updated_at?: string
          venue_id?: string
          venue_name_at_time?: string | null
          voting_closes_at?: string | null
          winner_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_cover_photo_event_log_id_fkey"
            columns: ["cover_photo_event_log_id"]
            isOneToOne: false
            referencedRelation: "event_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: Database["public"]["Enums"]["follow_status"]
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: Database["public"]["Enums"]["follow_status"]
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: Database["public"]["Enums"]["follow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          country: string
          created_at: string
          display_order: number
          event_template: Database["public"]["Enums"]["event_template"]
          id: string
          is_active: boolean
          name: string
          slug: string
          sport: Database["public"]["Enums"]["sport_type"]
        }
        Insert: {
          country?: string
          created_at?: string
          display_order?: number
          event_template: Database["public"]["Enums"]["event_template"]
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sport: Database["public"]["Enums"]["sport_type"]
        }
        Update: {
          country?: string
          created_at?: string
          display_order?: number
          event_template?: Database["public"]["Enums"]["event_template"]
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sport?: Database["public"]["Enums"]["sport_type"]
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          event_log_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_log_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_log_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_event_log_id_fkey"
            columns: ["event_log_id"]
            isOneToOne: false
            referencedRelation: "event_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      list_follows: {
        Row: {
          created_at: string
          id: string
          list_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_follows_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          created_at: string
          display_name: string
          display_order: number
          event_tag: string | null
          id: string
          list_id: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          display_order?: number
          event_tag?: string | null
          id?: string
          list_id: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          display_order?: number
          event_tag?: string | null
          id?: string
          list_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          forked_from: string | null
          id: string
          is_featured: boolean
          item_count: number
          league_id: string | null
          list_type: Database["public"]["Enums"]["list_type"]
          name: string
          source: Database["public"]["Enums"]["list_source"]
          sport: Database["public"]["Enums"]["sport_type"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          forked_from?: string | null
          id?: string
          is_featured?: boolean
          item_count?: number
          league_id?: string | null
          list_type: Database["public"]["Enums"]["list_type"]
          name: string
          source: Database["public"]["Enums"]["list_source"]
          sport?: Database["public"]["Enums"]["sport_type"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          forked_from?: string | null
          id?: string
          is_featured?: boolean
          item_count?: number
          league_id?: string | null
          list_type?: Database["public"]["Enums"]["list_type"]
          name?: string
          source?: Database["public"]["Enums"]["list_source"]
          sport?: Database["public"]["Enums"]["sport_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lists_forked_from_fkey"
            columns: ["forked_from"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lists_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          in_app_enabled: boolean
          push_enabled: boolean
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          in_app_enabled?: boolean
          push_enabled?: boolean
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          in_app_enabled?: boolean
          push_enabled?: boolean
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          target_id: string | null
          target_type: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          target_id?: string | null
          target_type?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          target_id?: string | null
          target_type?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_likes: {
        Row: {
          created_at: string
          event_log_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_log_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_log_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_likes_event_log_id_fkey"
            columns: ["event_log_id"]
            isOneToOne: false
            referencedRelation: "event_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          comments_enabled: boolean
          cover_photo_count: number
          created_at: string
          default_privacy: Database["public"]["Enums"]["privacy_tier"]
          display_name: string | null
          fav_athlete_id: string | null
          fav_event_id: string | null
          fav_sport: Database["public"]["Enums"]["sport_type"] | null
          fav_team_id: string | null
          fav_venue_id: string | null
          id: string
          is_private: boolean
          pinned_list_1_id: string | null
          pinned_list_2_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          comments_enabled?: boolean
          cover_photo_count?: number
          created_at?: string
          default_privacy?: Database["public"]["Enums"]["privacy_tier"]
          display_name?: string | null
          fav_athlete_id?: string | null
          fav_event_id?: string | null
          fav_sport?: Database["public"]["Enums"]["sport_type"] | null
          fav_team_id?: string | null
          fav_venue_id?: string | null
          id: string
          is_private?: boolean
          pinned_list_1_id?: string | null
          pinned_list_2_id?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          comments_enabled?: boolean
          cover_photo_count?: number
          created_at?: string
          default_privacy?: Database["public"]["Enums"]["privacy_tier"]
          display_name?: string | null
          fav_athlete_id?: string | null
          fav_event_id?: string | null
          fav_sport?: Database["public"]["Enums"]["sport_type"] | null
          fav_team_id?: string | null
          fav_venue_id?: string | null
          id?: string
          is_private?: boolean
          pinned_list_1_id?: string | null
          pinned_list_2_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_fav_athlete_id_fkey"
            columns: ["fav_athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_fav_event_id_fkey"
            columns: ["fav_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_fav_team_id_fkey"
            columns: ["fav_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_fav_venue_id_fkey"
            columns: ["fav_venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_pinned_list_1_id_fkey"
            columns: ["pinned_list_1_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_pinned_list_2_id_fkey"
            columns: ["pinned_list_2_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          abbreviation: string
          city: string
          created_at: string
          external_ids: Json
          id: string
          is_active: boolean
          league_id: string
          logo_url: string | null
          name: string
          short_name: string
        }
        Insert: {
          abbreviation: string
          city: string
          created_at?: string
          external_ids?: Json
          id?: string
          is_active?: boolean
          league_id: string
          logo_url?: string | null
          name: string
          short_name: string
        }
        Update: {
          abbreviation?: string
          city?: string
          created_at?: string
          external_ids?: Json
          id?: string
          is_active?: boolean
          league_id?: string
          logo_url?: string | null
          name?: string
          short_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_league_favorites: {
        Row: {
          athlete_id: string | null
          category: string
          created_at: string
          event_id: string | null
          id: string
          is_featured: boolean
          league_id: string
          team_id: string | null
          user_id: string
          venue_id: string | null
        }
        Insert: {
          athlete_id?: string | null
          category: string
          created_at?: string
          event_id?: string | null
          id?: string
          is_featured?: boolean
          league_id: string
          team_id?: string | null
          user_id: string
          venue_id?: string | null
        }
        Update: {
          athlete_id?: string | null
          category?: string
          created_at?: string
          event_id?: string | null
          id?: string
          is_featured?: boolean
          league_id?: string
          team_id?: string | null
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_league_favorites_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_league_favorites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_league_favorites_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_league_favorites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_league_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_league_favorites_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_aliases: {
        Row: {
          alias_name: string
          created_at: string
          effective_from: string | null
          effective_to: string | null
          id: string
          venue_id: string
        }
        Insert: {
          alias_name: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          venue_id: string
        }
        Update: {
          alias_name?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_aliases_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_teams: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          season_end: number | null
          season_start: number | null
          team_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          season_end?: number | null
          season_start?: number | null
          team_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          season_end?: number | null
          season_start?: number | null
          team_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_teams_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_visits: {
        Row: {
          created_at: string
          id: string
          relationship: Database["public"]["Enums"]["venue_relationship"]
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          relationship: Database["public"]["Enums"]["venue_relationship"]
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relationship?: Database["public"]["Enums"]["venue_relationship"]
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_visits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          capacity: number | null
          city: string
          closed_year: number | null
          country: string
          created_at: string
          current_cover_event_id: string | null
          description: string | null
          external_ids: Json
          id: string
          location: unknown
          name: string
          opened_year: number | null
          photo_url: string | null
          state: string | null
          status: Database["public"]["Enums"]["venue_status"]
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          city: string
          closed_year?: number | null
          country?: string
          created_at?: string
          current_cover_event_id?: string | null
          description?: string | null
          external_ids?: Json
          id?: string
          location?: unknown
          name: string
          opened_year?: number | null
          photo_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["venue_status"]
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          city?: string
          closed_year?: number | null
          country?: string
          created_at?: string
          current_cover_event_id?: string | null
          description?: string | null
          external_ids?: Json
          id?: string
          location?: unknown
          name?: string
          opened_year?: number | null
          photo_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["venue_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_current_cover_event_id_fkey"
            columns: ["current_cover_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      event_attendance: {
        Row: {
          event_id: string | null
          public_logs: number | null
          total_logs: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          draws: number | null
          events_this_year: number | null
          losses: number | null
          total_events: number | null
          total_venues: number | null
          user_id: string | null
          venues_this_year: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      dearmor: { Args: { "": string }; Returns: string }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      gen_random_uuid: { Args: never; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      longtransactionsenabled: { Args: never; Returns: boolean }
      notification_event_target: {
        Args: { p_event_log_id: string }
        Returns: string
      }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: {
        Args: { target_version?: string }
        Returns: string
      }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_compiled_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_srs: {
        Args: { auth_name: string; auth_srid: string }
        Returns: {
          auth_name: string
          auth_srid: string
          point_ne: unknown
          point_sw: unknown
          proj4text: string
          srname: string
          srtext: string
        }[]
      }
      postgis_srs_all: {
        Args: never
        Returns: {
          auth_name: string
          auth_srid: string
          point_ne: unknown
          point_sw: unknown
          proj4text: string
          srname: string
          srtext: string
        }[]
      }
      postgis_srs_codes: { Args: { auth_name: string }; Returns: string[] }
      postgis_srs_search: {
        Args: { authname?: string; bounds: unknown }
        Returns: {
          auth_name: string
          auth_srid: string
          point_ne: unknown
          point_sw: unknown
          proj4text: string
          srname: string
          srtext: string
        }[]
      }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_transform_pipeline_geometry: {
        Args: {
          forward: boolean
          geom: unknown
          pipeline: string
          to_srid: number
        }
        Returns: unknown
      }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_inversetransformpipeline: {
        Args: { geom: unknown; pipeline: string; to_srid?: number }
        Returns: unknown
      }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_largestemptycircle: {
        Args: { boundary?: unknown; geom: unknown; tolerance?: number }
        Returns: Record<string, unknown>
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_lineextend: {
        Args: {
          distance_backward?: number
          distance_forward: number
          geom: unknown
        }
        Returns: unknown
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project:
        | {
            Args: { azimuth: number; distance: number; geog: unknown }
            Returns: unknown
          }
        | {
            Args: { distance: number; geog_from: unknown; geog_to: unknown }
            Returns: unknown
          }
        | {
            Args: { azimuth: number; distance: number; geom1: unknown }
            Returns: unknown
          }
        | {
            Args: { distance: number; geom1: unknown; geom2: unknown }
            Returns: unknown
          }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_transformpipeline: {
        Args: { geom: unknown; pipeline: string; to_srid?: number }
        Returns: unknown
      }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      uuid_generate_v1: { Args: never; Returns: string }
      uuid_generate_v1mc: { Args: never; Returns: string }
      uuid_generate_v3: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_generate_v4: { Args: never; Returns: string }
      uuid_generate_v5: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_nil: { Args: never; Returns: string }
      uuid_ns_dns: { Args: never; Returns: string }
      uuid_ns_oid: { Args: never; Returns: string }
      uuid_ns_url: { Args: never; Returns: string }
      uuid_ns_x500: { Args: never; Returns: string }
    }
    Enums: {
      event_template: "match" | "field"
      follow_status: "active" | "pending"
      list_source: "system" | "user"
      list_type: "venue" | "event"
      notification_type:
        | "like"
        | "comment"
        | "follow"
        | "follow_request_approved"
        | "companion_tag"
        | "badge_earned"
        | "progress_nudge"
        | "friend_activity"
        | "friend_milestone"
        | "follow_request"
      outcome_type: "win" | "loss" | "draw" | "neutral"
      privacy_tier: "show_all" | "hide_personal" | "hide_all"
      report_status: "pending" | "reviewed" | "resolved"
      report_target_type: "user" | "comment" | "event_log"
      sport_type:
        | "football"
        | "basketball"
        | "baseball"
        | "hockey"
        | "soccer"
        | "golf"
        | "motorsports"
        | "tennis"
      venue_relationship: "visited" | "want_to_visit"
      venue_status: "active" | "retired" | "demolished"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_template: ["match", "field"],
      follow_status: ["active", "pending"],
      list_source: ["system", "user"],
      list_type: ["venue", "event"],
      notification_type: [
        "like",
        "comment",
        "follow",
        "follow_request_approved",
        "companion_tag",
        "badge_earned",
        "progress_nudge",
        "friend_activity",
        "friend_milestone",
        "follow_request",
      ],
      outcome_type: ["win", "loss", "draw", "neutral"],
      privacy_tier: ["show_all", "hide_personal", "hide_all"],
      report_status: ["pending", "reviewed", "resolved"],
      report_target_type: ["user", "comment", "event_log"],
      sport_type: [
        "football",
        "basketball",
        "baseball",
        "hockey",
        "soccer",
        "golf",
        "motorsports",
        "tennis",
      ],
      venue_relationship: ["visited", "want_to_visit"],
      venue_status: ["active", "retired", "demolished"],
    },
  },
} as const
