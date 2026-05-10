#!/usr/bin/env python
import sys
sys.path.insert(0, 'backend')

try:
    from app.api.admin import admin_router
    print("✓ Admin module imported successfully")
    print(f"✓ Admin router has {len(admin_router.routes)} routes")
    
    routes = []
    for route in admin_router.routes:
        routes.append(f"  - {route.methods} {route.path}")
    
    print("\nRoutes:")
    for r in sorted(routes):
        print(r)
    
except Exception as e:
    print(f"✗ Error importing admin module: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
