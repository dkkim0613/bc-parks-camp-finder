CREATE TABLE `captured_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`level` text DEFAULT '' NOT NULL,
	`availability` text DEFAULT '' NOT NULL,
	`available` integer DEFAULT 0 NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`end_date` text DEFAULT '' NOT NULL,
	`nights` text DEFAULT '' NOT NULL,
	`equipment` text DEFAULT '' NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`captured_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refresh_status` (
	`id` text PRIMARY KEY NOT NULL,
	`refreshed_at` text NOT NULL,
	`refreshed_date_vancouver` text NOT NULL,
	`source` text NOT NULL,
	`mode` text DEFAULT 'sample-data-refresh' NOT NULL,
	`live_availability_connected` integer DEFAULT 0 NOT NULL,
	`manual_refresh_connected` integer DEFAULT 1 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stays` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`park` text NOT NULL,
	`area` text NOT NULL,
	`distance_km` integer NOT NULL,
	`drive_minutes` integer NOT NULL,
	`earliest` text NOT NULL,
	`available_dates` text DEFAULT '[]' NOT NULL,
	`available_date_offsets` text DEFAULT '[]' NOT NULL,
	`nights` text NOT NULL,
	`weekend` integer DEFAULT 0 NOT NULL,
	`max_party` integer DEFAULT 4 NOT NULL,
	`tents` text,
	`site_kind` text,
	`price` text NOT NULL,
	`price_note` text DEFAULT '' NOT NULL,
	`facilities` text DEFAULT '[]' NOT NULL,
	`activities` text DEFAULT '[]' NOT NULL,
	`fire_status` text DEFAULT 'unknown' NOT NULL,
	`cooking` text DEFAULT '' NOT NULL,
	`source_url` text NOT NULL,
	`booking_url` text NOT NULL,
	`fire_url` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
