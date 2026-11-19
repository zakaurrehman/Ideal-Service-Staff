import { test } from "node:test";
import assert from "node:assert/strict";
import { sniff } from "../src/lib/storage";
import { renderEmail } from "../src/lib/email/templates";

test("file types are detected from bytes, not names", () => {
  assert.equal(sniff(Buffer.from("%PDF-1.7\n%âãÏÓ\n")), "pdf");
  assert.equal(sniff(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
  assert.equal(sniff(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])), "jpg");
  assert.equal(sniff(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")])), "webp");
  assert.equal(sniff(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("....word/document.xml")])), "docx");
});

test("executables and scripts are rejected even when renamed", () => {
  assert.equal(sniff(Buffer.from("MZ\x90\x00\x03\x00\x00\x00"), "resume.pdf"), null);
  assert.equal(sniff(Buffer.from("\x7fELF\x02\x01\x01\x00"), "cv.docx"), null);
  assert.equal(sniff(Buffer.from("#!/bin/sh\nrm -rf /"), "photo.jpg"), null);
  assert.equal(sniff(Buffer.from("<html><script>alert(1)</script>"), "doc.pdf"), null);
  assert.equal(sniff(Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]), "archive.zip"), null, "plain zip is not a Word document");
});

test("email templates escape variables (no HTML injection)", () => {
  const out = renderEmail({ subject: "Hi {{firstName}}", body: "Hello {{firstName}}\n\n[button:Open]({{url}})" }, { firstName: "<img src=x onerror=alert(1)>", url: "javascript:alert(1)" });
  assert.ok(!out.html.includes("<img src=x"));
  assert.ok(out.html.includes("&lt;img"));
  assert.ok(!out.html.includes("javascript:"), "unsafe URL replaced");
});
