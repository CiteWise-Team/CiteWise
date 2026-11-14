import pymupdf

doc = pymupdf.open("c:/Users/admin/Documents/CiteWise/CiteWise/CiteWise-Fix-Verification-2026-09-19.pdf")
print("=== PAGE 1 BLOCKS ===")
p1 = doc[0]
for b in p1.get_text("blocks"):
    text = b[4].strip()
    if text:
        print(f"[{b[0]:.1f}, {b[1]:.1f}, {b[2]:.1f}, {b[3]:.1f}]: {text[:80]}")

print("\n=== PAGE 2 BLOCKS ===")
p2 = doc[1]
for b in p2.get_text("blocks"):
    text = b[4].strip()
    if text:
        print(f"[{b[0]:.1f}, {b[1]:.1f}, {b[2]:.1f}, {b[3]:.1f}]: {text[:80]}")

doc.close()
