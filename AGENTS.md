# Project conventions
- Workspace membership requires an existing workspace administrator's approval; self-service workspace/admin bootstrap is disabled, and invitation acceptance is atomic and validated server-side against the confirmed account email.
- Localize interface copy through LanguageContext and its shared dictionaries; preserve stored status codes and user-authored content so language changes never modify business data.
- Format localized dates using the locale exposed by LanguageContext so displayed dates follow the selected language.
- Shared display-only translation helpers require each consuming React view to subscribe to LanguageContext; translate only rendered labels, never control values, identity props or stored data.
