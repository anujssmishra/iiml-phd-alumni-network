import assert from "node:assert/strict";
import test from "node:test";
import { hasExactAcademicDomain, isVerifiedGoogleIdentity, normalizeEmail, safeCallbackPath } from "../src/lib/auth-policy";

test("email normalization is stable without merging distinct mailboxes", () => {
  assert.equal(normalizeEmail(" Alumni.Name+network@IIML.AC.IN "), "alumni.name+network@iiml.ac.in");
  assert.notEqual(normalizeEmail("alumni.name@gmail.com"), normalizeEmail("alumniname@gmail.com"));
  for (const value of [null, undefined, 1, {}, "", "person", "p@iiml", "p@@iiml.ac.in", "p@iiml.ac.in\nattacker", ".p@iiml.ac.in", "p..q@iiml.ac.in", "p@-iiml.ac.in", `${"p".repeat(65)}@iiml.ac.in`]) {
    assert.equal(normalizeEmail(value), null, `Invalid email was accepted: ${String(value)}`);
  }
});

test("only a matching verified Google identity is eligible to sign in", () => {
  const profile = { sub: "google-subject", email: "PERSON@iiml.ac.in", email_verified: true };
  const valid = { provider: "google", profile, email: "person@iiml.ac.in" };
  assert.equal(isVerifiedGoogleIdentity(valid), true);
  assert.equal(isVerifiedGoogleIdentity({ ...valid, provider: "linkedin" }), false);
  assert.equal(isVerifiedGoogleIdentity({ ...valid, provider: undefined }), false);
  assert.equal(isVerifiedGoogleIdentity({ ...valid, email: "someone-else@iiml.ac.in" }), false);
  for (const value of [null, {}, { ...profile, email_verified: false }, { ...profile, email_verified: "true" }, { ...profile, email_verified: undefined }, { ...profile, sub: "" }, { ...profile, email: "not an email" }]) {
    assert.equal(isVerifiedGoogleIdentity({ ...valid, profile: value }), false);
  }
});

test("a verified personal mailbox may apply without being marked academically affiliated", () => {
  const email = "alumnus@gmail.com";
  assert.equal(isVerifiedGoogleIdentity({ provider: "google", email, profile: { sub: "personal-account", email, email_verified: true } }), true);
  assert.equal(hasExactAcademicDomain(email, ["iiml.ac.in"]), false);
});

test("institutional mailbox evidence uses exact normalized domains", () => {
  assert.equal(hasExactAcademicDomain("person@IIML.AC.IN", [" IIML.AC.IN "]), true);
  for (const email of ["p@iiml.ac.in.attacker.com", "p@fake-iiml.ac.in", "p@students.iiml.ac.in", "p@any.edu", "p@any.ac.in", "p@iiml.ac.in@attacker.com"]) {
    assert.equal(hasExactAcademicDomain(email, ["iiml.ac.in"]), false, email);
  }
  assert.equal(hasExactAcademicDomain("p@iiml.ac.in", []), false);
});

test("callback policy accepts local destinations and rejects open redirects and sign-in loops", () => {
  assert.equal(safeCallbackPath("/directory?q=finance&page=2#results"), "/directory?q=finance&page=2#results");
  assert.equal(safeCallbackPath("/"), "/");
  for (const value of [undefined, null, 3, [], "https://attacker.example/", "//attacker.example", "///attacker.example", "/\\attacker.example", "/directory\n", "/signin", "/signin/", "/signin?callbackUrl=/signin", "/api/auth/signin", "/api/auth/callback/google"]) {
    assert.equal(safeCallbackPath(value), "/membership", `Unsafe callback was accepted: ${String(value)}`);
  }
});
