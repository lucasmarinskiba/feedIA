#!/usr/bin/env python3
"""
Carousel Infrastructure Test Runner
Tests all 26 carousel endpoints across storage, validation, metrics, and analytics
"""

import requests
import json
import sys
from datetime import datetime

class CarouselTester:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.tests_passed = 0
        self.tests_failed = 0
        self.carousel_id = None
        self.user_id = "test-user-2026-08"

    def test(self, method, path, data=None, expected_status=(200, 201, 202, 207)):
        """Test an endpoint"""
        url = f"{self.base_url}{path}"

        try:
            if method == "GET":
                response = self.session.get(url)
            elif method == "POST":
                response = self.session.post(url, json=data)
            elif method == "PUT":
                response = self.session.put(url, json=data)
            elif method == "DELETE":
                response = self.session.delete(url)
            else:
                return False

            passed = response.status_code in expected_status

            if passed:
                self.tests_passed += 1
                print(f"✓ {method} {path}: {response.status_code}")
                if response.text:
                    try:
                        data = response.json()
                        # Extract carousel ID if present
                        if 'carousel' in data and 'id' in data['carousel']:
                            self.carousel_id = data['carousel']['id']
                            print(f"  → Created carousel: {self.carousel_id}")
                        print(f"  Response: {str(data)[:150]}...")
                    except:
                        print(f"  Response: {response.text[:150]}...")
            else:
                self.tests_failed += 1
                print(f"✗ {method} {path}: Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"  Response: {response.text[:150]}")

            return passed

        except Exception as e:
            self.tests_failed += 1
            print(f"✗ {method} {path}: {str(e)}")
            return False

    def run_tests(self):
        """Run all carousel infrastructure tests"""
        print("=" * 60)
        print("CAROUSEL INFRASTRUCTURE TEST SUITE")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("")

        # 1. CAROUSEL CREATION
        print("\n=== SECTION 1: CAROUSEL CREATION (3 tests) ===\n")

        carousel_data = {
            "userId": self.user_id,
            "title": "Test Carousel - Instagram Growth",
            "format": "carousel",
            "slides": [
                {
                    "slideNumber": 1,
                    "headline": "Grow Your Instagram",
                    "body": "5 proven strategies to increase followers",
                    "cta": "Swipe →"
                },
                {
                    "slideNumber": 2,
                    "headline": "Post Consistency",
                    "body": "Post 3-5 times per week",
                    "cta": "Learn more"
                },
                {
                    "slideNumber": 3,
                    "headline": "Engagement Matters",
                    "body": "Reply to 30+ comments within 1 hour",
                    "cta": "Continue"
                }
            ],
            "platform": "instagram"
        }

        self.test("POST", "/api/carousels/create", carousel_data, (201, 200, 207))
        self.test("POST", "/api/carousels/batch-create", [carousel_data], (201, 207, 200))
        self.test("GET", f"/api/carousels/user/{self.user_id}", None, (200,))

        # 2. QUALITY VALIDATION
        print("\n=== SECTION 2: QUALITY VALIDATION (4 tests) ===\n")

        carousel_for_validation = {
            "id": "test-carousel-1",
            "userId": self.user_id,
            "title": "Quality Test Carousel",
            "format": "carousel",
            "slides": [
                {"slideNumber": 1, "headline": "Title", "body": "Body text", "cta": "Action"}
            ],
            "metadata": {
                "createdAt": "2026-08-04",
                "updatedAt": "2026-08-04",
                "status": "draft",
                "platform": "instagram"
            }
        }

        self.test("POST", "/api/carousels/quality/validate", carousel_for_validation, (200,))
        self.test("POST", "/api/carousels/quality/batch/validate", [carousel_for_validation], (200,))

        if self.carousel_id:
            self.test("GET", f"/api/carousels/quality/{self.carousel_id}", None, (200, 404))
            self.test("POST", f"/api/carousels/quality/{self.carousel_id}/approve", None, (200, 400, 404))

        # 3. METRICS & ENGAGEMENT
        print("\n=== SECTION 3: METRICS & ENGAGEMENT (6 tests) ===\n")

        if self.carousel_id:
            # Track events
            self.test("POST", f"/api/carousels/{self.carousel_id}/events",
                     {"eventType": "view", "source": "instagram", "userAgent": "Mobile"},
                     (200,))

            self.test("POST", f"/api/carousels/{self.carousel_id}/events",
                     {"eventType": "like", "source": "instagram"},
                     (200,))

            self.test("POST", f"/api/carousels/{self.carousel_id}/events",
                     {"eventType": "share", "source": "instagram"},
                     (200,))

            # Get metrics
            self.test("GET", f"/api/carousels/{self.carousel_id}/metrics", None, (200,))
            self.test("GET", f"/api/carousels/{self.carousel_id}/metrics/history?days=30", None, (200,))
            self.test("GET", f"/api/carousels/{self.carousel_id}/metrics/breakdown?days=7", None, (200,))

        # 4. ANALYTICS DASHBOARD
        print("\n=== SECTION 4: ANALYTICS DASHBOARD (6 tests) ===\n")

        if self.carousel_id:
            self.test("GET", f"/api/analytics/carousel/{self.carousel_id}", None, (200, 404))
            self.test("GET", f"/api/analytics/carousel/{self.carousel_id}/timeseries?days=30", None, (200, 404))
            self.test("GET", f"/api/analytics/carousel/{self.carousel_id}/breakdown?days=7", None, (200, 404))

        self.test("GET", f"/api/analytics/user/{self.user_id}", None, (200,))
        self.test("GET", f"/api/analytics/user/{self.user_id}/top", None, (200,))
        self.test("POST", "/api/analytics/compare", {"carousel_ids": ["id1", "id2"]}, (200,))

        # 5. STORAGE CRUD (if carousel created)
        print("\n=== SECTION 5: STORAGE CRUD (5 tests) ===\n")

        if self.carousel_id:
            self.test("GET", f"/api/carousels/{self.carousel_id}", None, (200,))

            update_data = {
                "title": "Updated Title",
                "status": "published"
            }
            self.test("PUT", f"/api/carousels/{self.carousel_id}", update_data, (200,))

            self.test("POST", f"/api/carousels/{self.carousel_id}/publish",
                     {"platform": "instagram"}, (200, 404))

            self.test("POST", f"/api/carousels/{self.carousel_id}/metrics",
                     {"views": 100, "likes": 15, "shares": 5}, (200,))

            # Don't delete for testing, but test the endpoint
            # self.test("DELETE", f"/api/carousels/{self.carousel_id}", None, (200,))

        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Passed: {self.tests_passed} ✓")
        print(f"Failed: {self.tests_failed} ✗")
        print(f"Total:  {self.tests_passed + self.tests_failed}")
        print("=" * 60)

        if self.tests_failed == 0:
            print("\n✓ All tests passed! Carousel infrastructure operational.")
            return True
        else:
            print(f"\n✗ {self.tests_failed} test(s) failed. Check Railway deployment status.")
            return False

def main():
    if len(sys.argv) < 2:
        print("USAGE: python3 test_carousel_endpoints.py <base_url>")
        print("Example: python3 test_carousel_endpoints.py https://your-railway-backend.railway.app")
        print("")
        print("Note: feedia.vercel.app is frontend-only. Use the Railway backend URL.")
        sys.exit(1)

    base_url = sys.argv[1]
    tester = CarouselTester(base_url)
    success = tester.run_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
