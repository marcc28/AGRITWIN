# Field location, boundaries and area

Related work: #151, #152, #153, #154 and #155.

## Scope

The create-field form accepts a manually entered address or a point selected on
an OpenStreetMap map. Leaflet 1.9.4 renders the map. No map API key, Google Cloud
project, account, payment method or billing configuration is required.

The button beside the location input opens the picker. Clicking or tapping the
map selects a candidate. **Use this location** applies it to the form; **Cancel**
or the Android back button discards it. Reopening starts at the confirmed point.
Without a boundary, editing the location text clears the coordinates so they
cannot describe a previous address. **Find address** retains the existing authenticated backend
geocoder and can locate an address before the user refines its point on the map.

Map confirmation resolves a nearby address through the authenticated
`/api/v1/reverse-geocode` endpoint and fills Location with only the street and city. Street numbers, neighbourhoods,
provinces, postal codes and countries are omitted. For villages or towns, the
corresponding settlement is used. Missing parts are not invented. The
selected coordinates remain unchanged and appear below the input with six decimal
places. Reverse geocoding finds the nearest suitable mapped address; a rural
parcel may not have a street address. If no address is found, coordinates remain
selected and the user can enter a description manually. Address lookup is performed
only on confirmation, not for each map click.

For **Open field**, **Greenhouse** and **Orchard**, an optional section appears
immediately after the field type. Users select 3–200 corners in order on a map.
The outline closes automatically; Undo, Start again, Cancel and reopening the
confirmed border are supported. Crossing edges, repeated corners, invalid
coordinates, zero-area shapes and oversized fields cannot be confirmed.

The form accepts m², hectares, acres, km² and square feet. Changing units converts
the current value. Comma decimals are accepted for manual input. With a confirmed
boundary, area is calculated automatically and the numeric input is read-only;
users can still change the display unit. Removing the boundary retains the last
area as a manual value. Choosing Home garden removes the boundary. Selecting a
new single location also removes the boundary. Editing the address of a bordered
field changes its label while retaining its geometric centre.

All usable areas are sent and stored in `size_m2`, with two-decimal database precision.
The API validates every supplied boundary and exclusion, recalculates the usable
area independently of the client-supplied size, and stores its centroid in `lat`/`lon`. The ordered
`boundary` array and its `excluded_zones` are persisted and returned on field reads. The supported database
range is 0.01–99,999,999.99 m². Polygons crossing the antimeridian are not supported. A single spherical ring calculation uses the mean Earth radius
6,371,008.8 m; the centroid is calculated in longitude/latitude relative to the
first corner to reduce numerical cancellation. This is an approximate surface
measurement, not a cadastral survey.

## Technical implementation

**Frontend.** The Expo/React Native screens `create-field.tsx` and `edit-field.tsx`
manage form state. Shared `FieldLocationPicker` and `FieldBoundaryPicker` modals
hold candidate geometry until confirmation. Web uses Leaflet; Android/iOS use
Leaflet inside a WebView. `fieldGeometry.ts` validates the rings, calculates live
area totals and converts the selected input/display unit. Confirming a modal
updates the form; creating the field or pressing Accept in editing sends it to
the API. Cancelling a modal discards its candidate changes. Buildings are marked
manually as excluded zones; there is no automatic building detection.

**Backend.** FastAPI/Pydantic validates the request coordinates and ring limits.
`field_geometry_service.py` independently checks polygon validity, calculates
usable area and its representative centroid, and supplies the canonical values
for storage. A client-supplied area cannot override the calculated area of a drawn
field. SQL writes bind parameters and updates/reads include the authenticated
owner. `geocode_service.py` uses structured address data for street/city labels.
The weather service uses saved coordinates and keeps the current field address
when returning cached forecasts.

## Database representation

The existing `fields` table gains two nullable JSONB columns in PostgreSQL.
SQLAlchemy uses the JSON equivalent in SQLite for local validation. No new
geometry table or PostGIS extension was added.

| Column           | Change                 | Stored value                                                                                   |
| ---------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| `boundary`       | New JSONB              | Ordered array of outer corners, each `{lat, lon}`; null for manual area without a drawn border |
| `excluded_zones` | New JSONB              | Array of interior corner arrays; empty array for no exclusions                                 |
| `size_m2`        | Existing NUMERIC(10,2) | Usable area in square metres, to two decimal places                                            |
| `lat`, `lon`     | Existing coordinates   | Selected point, or area-weighted centroid for a drawn field                                    |
| `location`       | Existing VARCHAR(255)  | Address label; automatic lookup supplies street and city                                       |

A simplified stored example with one excluded zone is:

```json
{
  "boundary": [
    { "lat": 0, "lon": 0 },
    { "lat": 0, "lon": 0.001 },
    { "lat": 0.001, "lon": 0.001 },
    { "lat": 0.001, "lon": 0 }
  ],
  "excluded_zones": [
    [
      { "lat": 0.0002, "lon": 0.0002 },
      { "lat": 0.0002, "lon": 0.0004 },
      { "lat": 0.0004, "lon": 0.0004 },
      { "lat": 0.0004, "lon": 0.0002 }
    ]
  ],
  "size_m2": 11869.78
}
```

These simplified coordinates form the equatorial square used in the automated
geometry checks. Its gross area is 12,364.35 m², its excluded area is 494.57 m²,
and its usable area is 11,869.78 m². The renderer joins the last corner back to
the first; the stored arrays do not repeat the first point. Ordered coordinates
let the client reconstruct the drawing after reloading a field. Gross and
excluded totals are derived from those rings rather than duplicated in columns.
Geometry validity is enforced by the API; JSONB alone does not enforce polygon
rules for direct database writes.

Only the canonical square-metre area is persisted. Conversion factors are
1 ha = 10,000 m², 1 acre = 4,046.8564224 m², 1 km² = 1,000,000 m² and
1 ft² = 0.09290304 m². The chosen display unit is form state, not a saved field
preference; reopening an editor starts in m².

API data flow: `GET /api/v1/geocode` or `/api/v1/reverse-geocode` supplies the
address and coordinates; `POST /api/v1/fields` creates the field;
`PUT /api/v1/fields/{id}` replaces or clears its geometry; field list/detail
responses return both rings and exclusions.

## Buildings and other excluded areas

After drawing the outer border, select **Add excluded zone** and mark the corners
of a cabin, pond, track or other non-growing area. Multiple zones are supported.
Each zone has its own selectable tab and can be undone or removed. The map shows
the outer field in green and exclusions in red, with actual cutouts in the green
fill. It reports gross, excluded and usable area separately:

`usable area = outer area - sum(excluded areas)`

Buildings are not detected automatically; users identify them by drawing the
excluded outline. Every exclusion must be a valid simple ring strictly inside
the outer border. Touching the outer edge, overlapping, nested and mutually
touching exclusions are rejected. Limits are 20 excluded zones, 200 corners per
ring and 1,000 corners in total. Both client and server validate these rules.

The ordered rings persist in `excluded_zones`. `size_m2` stores the usable area;
gross/excluded areas can be reconstructed from the saved rings. The location is
an area-weighted centroid after subtracting exclusions. A geometric centroid can
fall outside a concave shape or inside a symmetric hole; it is a representative
location, not a guaranteed growing point.

The same functionality is available during creation and editing. Fields entered
only as a numeric area have no known outline: the app explains this instead of
inventing a polygon. Users can draw one when editing supported field types.

## Backend deployment

Apply `backend/migrations/20261109_field_boundary.sql` to an existing PostgreSQL
database **before** deploying the updated backend. Fresh databases created from
the ORM or baseline schema already include both new columns. Deploy the
backend and then the frontend. The frontend checks the backend schema before
sending a boundary, preventing an older API from silently dropping its corners.
The edit screen offers unit conversion, a read-only map, editing the saved rings,
starting a fresh outline and explicitly removing the current geometry/area. Modal
changes are staged: Cancel restores the form's previous geometry, and **Accept**
is required to persist the edited field. A fresh outline replaces the previous
outer border and exclusions. Removing the boundary clears its automatic area so
the user can enter a new manual value. Older requests that omit geometry retain
it when field type and canonical area remain unchanged.

Forward and reverse geocoding share a one-request-per-second limiter and bounded
cache in `services/geocode_service.py`. Network calls run in a thread pool, not on
the request event loop. The public Nominatim service is intended for moderate,
user-triggered use; read its policy below. This limiter/cache operates in one
process. Use one geocoding worker or a shared rate-limited proxy when running
multiple processes/instances. `GEOCODING_BASE_URL` allows switching providers.

## Platforms and network access

- Web bundles Leaflet through npm and loads it only when the picker opens. Loading
  happens after mounting so server rendering does not access browser globals.
- Android and iOS display a local HTML map in `react-native-webview` 13.16.0,
  compatible with Expo SDK 55 and included in Expo Go. The HTML loads the pinned
  Leaflet 1.9.4 JavaScript and stylesheet from `unpkg.com` with integrity hashes.
  A content security policy restricts resources; navigation is limited to the
  document and known attribution links. No authentication token is sent to it.
- Map tiles come directly from `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
  Visible OpenStreetMap attribution is retained. Native requests identify the
  app through its user agent. Browser requests use the browser's normal user
  agent and referrer. Hosting must not strip the referrer for tile requests.
- Tile requests use the browser/WebView HTTP cache. The picker has no offline
  download or bulk prefetch feature and uses a zero offscreen tile buffer.
- SDK errors, tile failures and timeouts display a fallback. Users can close the
  picker and enter an address manually. Incoming native messages are checked
  for finite numeric coordinates and valid latitude/longitude ranges.

## Service limits and deployment

OpenStreetMap data and the public tile service do not require a billing account.
The public tile service is community-funded, has limited capacity and provides
no availability guarantee. It is appropriate for modest interactive use that
follows its policy; it is not unlimited hosting for a high-traffic deployment.
Do not add bulk downloads, offline map packs or automated map-scanning jobs.
Automated tests mock tile loading and never pan across real public map tiles.

If usage grows, choose a suitable provider or host tiles separately. The tile
source is configurable through these optional build environment variables:

```dotenv
EXPO_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
EXPO_PUBLIC_MAP_TILE_ATTRIBUTION=
```

The defaults work without creating an environment file. For another provider,
use an HTTPS URL, review its terms and add its required attribution in the second
variable. OpenStreetMap attribution remains visible. Restart Metro or rebuild the
web bundle after configuration changes. Native apps need the WebView dependency
included in their binary; existing custom builds must be rebuilt if missing it.

To run web locally from `agritwin-app`:

```sh
npm ci
# Keep EXPO_PUBLIC_API_URL configured for the existing backend.
npm run web -- --host localhost --port 8081
```

Open `http://localhost:8081/create-field` and sign in with an existing AGRITWIN
account if redirected. From Settings, creating a new garden opens the same form.
The local frontend uses whichever backend `EXPO_PUBLIC_API_URL` identifies;
creating a field saves it in that backend. Merely opening or cancelling the map
creates no field.

## Validation

```sh
cd agritwin-app
npm run typecheck
npm run lint
npm run format:check
npx jest __tests__ --runInBand
npx expo export --platform web
```

### Verified execution: 2026-11-09

The current working tree was validated with:

| Check                    | Result                        | Scope                                                                                     |
| ------------------------ | ----------------------------- | ----------------------------------------------------------------------------------------- |
| Frontend Jest            | 512 tests passed in 69 suites | Complete frontend unit test suite, including existing tests                               |
| Backend pytest           | 150 tests passed              | Selected field/geometry/geocoding/weather suites, including existing tests                |
| Manual web checks        | Passed                        | Map drawing, unit changes, excluded-zone removal, cancellation and read-only viewing      |
| Local persistence checks | Passed                        | Create/read, geometry replacement, exclusions, explicit clearing and another-owner denial |
| Live provider checks     | Passed                        | Street/city lookup and weather responses for a public sample location                     |

Existing ESLint warnings concern require-style imports in older tests and unused
home-screen variables. They were not introduced by this feature.

Backend validation includes these files:

```text
tests/unit/services/test_geocode_service.py
tests/unit/services/test_field_geometry_service.py
tests/unit/router/test_fields_router.py
tests/unit/test_field_schema.py
tests/unit/test_field_weather_service.py
tests/unit/test_weather_service.py
tests/unit/test_fallback_weather_service.py
tests/unit/router/test_weather_router.py
tests/unit/router/test_weather_flow.py
```

Backend tests use isolated fixtures and mocked external providers. The selected
150 tests are not the complete repository backend suite. Existing dependency
warnings about pytest-asyncio fixture scope and naive UTC datetime defaults were
reported; these runs had no failing tests. No coverage percentage was collected.
The live provider and local HTTP checks above were separate from unit tests.

Automated coverage includes geometry validation and known areas, unit conversions,
address filling, polygon submission, backend recomputation, reverse geocoding,
provider caching, authentication, native message validation and existing form flows.
Tests mock external map services. A local SQLite check additionally verifies that
corners survive a create/read round trip and another owner cannot read the field.

Before release, validate web and physical Android/iOS devices separately:

1. Create a field using only a manual address.
2. Find an address, open the map, move the point, confirm and create the field.
   Verify the response stores the selected latitude and longitude.
3. Reopen the picker, select another candidate and cancel. Confirm the saved point
   has not changed. Repeat with the Android back button.
4. Edit the address after confirmation. Check the next create request has null
   coordinates until another lookup or map selection is confirmed.
5. Test offline behavior, attribution links, zoom and point visibility on a phone
   and desktop. Enter an address manually after closing a failed map.

## References

- [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)
- [Nominatim reverse geocoding](https://nominatim.org/release-docs/latest/api/Reverse/)
- [Leaflet 1.9.4 API](https://leafletjs.com/reference-1.9.4.html)
- [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
- [Expo SDK 55: react-native-webview](https://docs.expo.dev/versions/v55.0.0/sdk/webview/)

## Additional editing checks

- Change display units and save without changing geometry. Verify `size_m2` and
  all rings remain unchanged after a reload.
- View the map and confirm it has no geometry-editing controls.
- Redraw the field, then cancel: its original area and exclusions remain.
- Confirm a different outline and press Accept: its corners replace the previous
  geometry, with a server-calculated area.
- Remove the boundary, enter a manual area in hectares and save. Verify both
  boundary and exclusions are cleared and the canonical area is in m².
- Draw an internal cabin and confirm the usable area decreases. Delete that zone
  and verify the usable area increases by the same amount.
- Reject an exclusion outside or touching the outer ring, crossing itself, or
  overlapping/nesting inside another exclusion.
- Reload a saved field with exclusions and verify the map, totals and rings.

## Current rollout status

Implementation is on the local `feature/151-field-geolocation` working tree,
based on commit `d05cf30`. The current changes have not been committed, pushed,
merged or deployed. Another person must approve the pull request before merging.

The local preview uses SQLite with the geometry columns present. Local field
labels were shortened to street/city. The production PostgreSQL migration is
prepared in `backend/migrations/20261109_field_boundary.sql` and has not been
applied to the published database during this work. It adds `boundary` and
`excluded_zones` with `ADD COLUMN IF NOT EXISTS` and does not remove existing
fields. Apply the migration before deploying the backend, then deploy the frontend.
The local preview runner lives outside the repository; its weather router was
activated during validation. The production application already registers that
router in `backend/main.py`.

The web flow and local API persistence have been checked. Physical Android/iOS
verification and PostgreSQL deployment verification remain pending. The area
calculation is a spherical approximation, and the public map/geocoding services
have the usage limits documented above. No coverage percentage was measured in
these validation runs.
