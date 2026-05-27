import json
from src.app import create_app

app = create_app()
openapi_schema = app.openapi()

with open("openapi/openapi.json", "w") as f:
    json.dump(openapi_schema, f, indent=2)
