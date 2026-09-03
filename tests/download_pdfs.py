import urllib.request
import os

pdf_urls = [
    # Highly relevant (AI / Machine Learning / Natural Language Processing)
    "https://arxiv.org/pdf/1706.03762.pdf", # Attention Is All You Need
    "https://arxiv.org/pdf/1810.04805.pdf", # BERT
    "https://arxiv.org/pdf/2005.14165.pdf", # GPT-3
    "https://arxiv.org/pdf/1409.0473.pdf",  # Neural Machine Translation (Bahdanau)
    "https://arxiv.org/pdf/1512.03385.pdf", # ResNet
    "https://arxiv.org/pdf/1312.6114.pdf",  # VAE
    "https://arxiv.org/pdf/1406.2661.pdf",  # GAN
    "https://arxiv.org/pdf/1409.1556.pdf",  # VGG
    "https://arxiv.org/pdf/1907.11692.pdf", # RoBERTa
    "https://arxiv.org/pdf/1607.06450.pdf", # Layer Normalization
    "https://arxiv.org/pdf/1802.05365.pdf", # ELMo
    "https://arxiv.org/pdf/2103.00020.pdf", # CLIP
    "https://arxiv.org/pdf/2010.11929.pdf", # ViT
    "https://arxiv.org/pdf/2107.03374.pdf", # Codex
    "https://arxiv.org/pdf/2204.02311.pdf", # PaLM

    # Irrelevant (Astrophysics / Quantum / Biology)
    "https://arxiv.org/pdf/2101.00001.pdf", # Dark matter
    "https://arxiv.org/pdf/2202.00001.pdf", # Quantum algorithms
    "https://arxiv.org/pdf/2003.00001.pdf", # Genomics
    "https://arxiv.org/pdf/1904.00001.pdf", # Exoplanets
    "https://arxiv.org/pdf/1805.00001.pdf", # Topology
]

save_dir = "tests/test-data/pdfs"
os.makedirs(save_dir, exist_ok=True)

for i, url in enumerate(pdf_urls):
    filename = f"paper_{i+1:02d}.pdf"
    filepath = os.path.join(save_dir, filename)
    print(f"Downloading {filename} from {url}...")
    try:
        # User-agent is required for arxiv, sometimes blocks generic requests
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(filepath, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        print(f"Successfully downloaded {filename}.")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")
