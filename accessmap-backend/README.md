# AccessMap Backend

Backend for the Personalised Accessible Mapping System.

## 1. Install

```bash
npm install
```

## 2. Database

The project is configured to use the MongoDB Atlas connection supplied for this project.

The database name is:

```text
accessmap
```

The URI is stored in `.env`, which is ignored by Git.

IMPORTANT: do not upload `.env` to GitHub or share it publicly. Rotate the MongoDB password if this credential has been exposed publicly.

## 3. Start server

```bash
npm start
```

Server:

```text
http://localhost:5000
```

Health check:

```text
GET http://localhost:5000/api/health
```

## 4. Import the supplied CSV

The supplied dataset contains:

- 4,378 total records
- 2,404 PLACE records
- 1,974 TACTILE_FEATURE records
- 29 columns

Copy the CSV into:

```text
data/delhi_accessibility_preprocessed (1).csv
```

Then run:

```bash
npm run import-data
```

Or pass another CSV path:

```bash
node scripts/importCSV.js "C:/path/to/file.csv"
```

The importer creates:

- Place documents
- AccessibilityFacility documents
- GeoJSON coordinates for map queries
- References from tactile/accessibility features to matching places where possible

## 5. Authentication API

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

Body:

```json
{
  "name": "Sanskar",
  "email": "sanskar@example.com",
  "password": "123456",
  "phone": "9876543210"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "sanskar@example.com",
  "password": "123456"
}
```

The response contains a JWT.

Send it as:

```text
Authorization: Bearer YOUR_TOKEN
```

### Current user

```http
GET /api/auth/me
Authorization: Bearer YOUR_TOKEN
```

## 6. Accessibility profile

```http
GET /api/profile
Authorization: Bearer YOUR_TOKEN
```

```http
PUT /api/profile
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

Example:

```json
{
  "mobility_needs": true,
  "sensory_needs": true,
  "preferences": {
    "ramps": true,
    "tactile_paths": true,
    "accessible_routes": true,
    "route_barriers": false,
    "voice_information": true
  }
}
```

## 7. Places

All places:

```http
GET /api/places
```

Search:

```http
GET /api/places?search=hospital
```

Category:

```http
GET /api/places?category=Hospital
```

Wheelchair:

```http
GET /api/places?wheelchair=yes
```

Tactile paving:

```http
GET /api/places?tactile_paving=yes
```

Nearby:

```http
GET /api/places/nearby?lat=28.6139&lng=77.2090&radius=5000
```

Single place:

```http
GET /api/places/PLACE_MONGODB_ID
```

## 8. Reviews

Create review:

```http
POST /api/reviews
Authorization: Bearer YOUR_TOKEN
```

```json
{
  "place_id": "PLACE_MONGODB_ID",
  "comment": "The entrance was accessible and easy to use.",
  "rating": 5
}
```

Get reviews:

```http
GET /api/reviews/place/PLACE_MONGODB_ID
```

## 9. Accessibility reports

Submit:

```http
POST /api/reports
Authorization: Bearer YOUR_TOKEN
```

```json
{
  "place_id": "PLACE_MONGODB_ID",
  "description": "The ramp is blocked by parked vehicles.",
  "report_type": "Ramp / entrance issue"
}
```

Admin list:

```http
GET /api/reports
Authorization: Bearer ADMIN_TOKEN
```

Admin update:

```http
PATCH /api/reports/REPORT_ID
Authorization: Bearer ADMIN_TOKEN
```

```json
{
  "status": "verified"
}
```

## 10. ER diagram mapping

User
- has one AccessibilityProfile
- searches Places
- reports accessibility issues
- writes Reviews

AccessibilityProfile
- belongs to User

Place
- has AccessibilityFacilities
- has Routes
- has Reviews

AccessibilityFacility
- can belong to Place

Route
- connects start Place and end Place
- has RouteFacility records

RouteFacility
- connects Route and AccessibilityFacility

Report
- belongs to User
- can belong to Place
- can be verified/updated by Admin

Review
- belongs to User and Place
- can optionally be moderated by Admin

Admin
- implemented through User.role = "admin"
- Admin collection preserves the ER diagram's separate Admin entity
