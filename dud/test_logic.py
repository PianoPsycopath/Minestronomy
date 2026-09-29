import pytest
import numpy as np
import math
from main import ra_dec_to_xyz, get_face_coords

def test_coordinate_conversion():
    # Test Zenith (Dec 90)
    v = ra_dec_to_xyz(0, 90)
    assert np.allclose(v, [0, 0, 1], atol=1e-7)
    
    # Test Equator (Dec 0, RA 0)
    v = ra_dec_to_xyz(0, 0)
    assert np.allclose(v, [1, 0, 0], atol=1e-7)

def test_face_mapping():
    # Vector pointing toward positive Z should map to face 4 (pz)
    face, u, v = get_face_coords(np.array([0, 0, 1]))
    assert face == 4
    
    # Vector pointing toward positive X should map to face 0 (px)
    face, u, v = get_face_coords(np.array([1, 0, 0]))
    assert face == 0

def test_data_integrity():
    # Ensure critical paths exist
    import os
    from main import CSV_FILE, NGC_FILE
    assert os.path.exists(CSV_FILE), f"Missing star catalog: {CSV_FILE}"
    assert os.path.exists(NGC_FILE), f"Missing NGC catalog: {NGC_FILE}"