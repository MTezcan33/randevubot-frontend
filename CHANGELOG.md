# Changelog

All notable changes to RandevuBot will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [0.13.0] - 2026-03-19

### Added
- Version system infrastructure (versions.json, CHANGELOG.md, database/ structure)
- Expert limit enforcement on StaffPage (checks company.expert_limit before adding)
- Lunch break conflict detection in CreateAppointmentModal
- Proper meta tags in index.html (title, description, theme-color)
- .env.example template

### Fixed
- recalculate_customer_stats: replaced undefined RPC with client-side calculation
- index.html title changed from "Hostinger Horizons" to "RandevuBot"

### Changed
- Database SQL files cataloged into database/schema/ and database/migrations/
- .version updated from "13" to semantic "0.13.0"
