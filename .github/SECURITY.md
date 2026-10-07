# Security Policy & Cryptographic Verification

## Ownership & Attribution
This repository and all resume artifacts hosted under `https://vallurikeerthiram.github.io/resume/` belong exclusively to **Valluri Keerthi Ram**.

* **Author:** Valluri Keerthi Ram
* **Primary Contact:** keerthiramvalluri@gmail.com
* **Alternative Contact:** bl.rn.u4cse23061@bl.students.amrita.edu
* **Portfolio:** https://vallurikeerthiram.github.io/

---

## Anti-Forgery & Cryptographic Verification
Any resume document claimed to originate from Valluri Keerthi Ram is cryptographically verifiable:

1. **Digital Document Signature:**
   * Authentic documents and studio states contain an immutable SHA-256 signature generated with the canonical seed:
     `[Document State Payload] + _VALLURI_KEERTHI_RAM_CANONICAL`
   * Changing any numerical value, publication title, date, or grade invalidates this checksum.

2. **Metadata Integrity:**
   * Authentic Microsoft Word (`.docx`) and Adobe Acrobat (`.pdf`) deliverables are generated via verified Microsoft Word COM automation with revision tracking and author lock:
     * `Author`: Valluri Keerthi Ram
     * `Creator / Producer`: Microsoft Word for Microsoft 365
     * `Revision`: 14+

---

## Repository Access & Protection
* **Access Control:** Only authenticated commits from Valluri Keerthi Ram (`keerthiramvalluri@gmail.com`) are authorized.
* **Crawler Disallow:** The `/resume/` directory is explicitly disallowed via `robots.txt` and protected by `<meta name="robots" content="noindex, nofollow, noarchive">` to prevent unauthorized indexing and web caching.
* **Client-Side Perimeter:** The web resume engine incorporates salted SHA-256 session access barriers and lockout monitors.
