import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import time
import unittest

spec = importlib.util.spec_from_file_location("qa255", Path(__file__).with_name("login-matchrim-qa255.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Session255(unittest.TestCase):
    def session(self):
        user_id = "00000000-0000-4000-8000-000000000255"
        claims = {"sub": user_id, "iss": module.ORIGIN + "/auth/v1", "role": "authenticated", "exp": time.time() + 3600}
        encoded = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
        return {"user": {"id": user_id, "email": module.EMAIL}, "access_token": "test." + encoded + ".test",
                "refresh_token": "synthetic-refresh"}, hashlib.sha256(user_id.encode()).hexdigest()

    def test_controlled_valid_not_live_auth(self):
        session, expected = self.session()
        self.assertEqual(module.validate_session(session, expected)["userIdSHA256"], expected)

    def test_wrong_owner(self):
        session, _ = self.session()
        with self.assertRaises(AssertionError):
            module.validate_session(session)

    def test_wrong_email(self):
        session, expected = self.session()
        session["user"]["email"] = "other@qa.invalid"
        with self.assertRaises(AssertionError):
            module.validate_session(session, expected)

    def test_anonymous(self):
        session, expected = self.session()
        session["user"]["is_anonymous"] = True
        with self.assertRaises(AssertionError):
            module.validate_session(session, expected)

    def test_missing_refresh(self):
        session, expected = self.session()
        session["refresh_token"] = None
        with self.assertRaises(AssertionError):
            module.validate_session(session, expected)

    def test_redirects_rejected(self):
        self.assertIsNone(module.NoRedirects().redirect_request(None, None, 302, "", {}, "https://other.invalid"))


if __name__ == "__main__":
    unittest.main()
