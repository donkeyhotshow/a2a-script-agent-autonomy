"""
Setup script for ai-integration package.
Use pyproject.toml for modern Python packaging.
"""

from setuptools import setup, find_packages

# Read requirements from requirements.txt
def read_requirements():
    with open('requirements.txt', 'r', encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip() and not line.startswith('#')]

setup(
    name="ai-integration",
    version="0.1.0",
    description="Local LLM upstream Proxy Service with AI Integration",
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    author="A2A Script Agent Team",
    packages=find_packages(),
    install_requires=read_requirements(),
    python_requires=">=3.8",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3.13",
    ],
    entry_points={
        'console_scripts': [
            'ai-proxy=proxy.__main__:main',
        ],
    },
)