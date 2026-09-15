from uuid import UUID
# Replace with the actual location of your ID generator utility
from src.ids import generate_id 

def test_generate_id_shape():
    """Verifies that generated IDs strictly adhere to the standard UUID4 text pattern."""
    # 1. Act: Generate a single identifier token
    identifier = generate_id()
    
    # 2. Assert: Confirm physical length and structural integrity
    assert len(identifier) == 36
    
    # Validates string parses to a UUID object and preserves matching hexadecimal dash styling
    parsed_uuid = UUID(identifier)
    assert str(parsed_uuid) == identifier

def test_generate_id_uniqueness():
    """Asserts that 1,000 sequentially generated identifiers yield zero collisions."""
    # 1. Arrange & Act: Pack 1,000 fresh IDs inside a uniqueness-enforcing Set collection
    sample_size = 1000
    unique_ids = {generate_id() for _ in range(sample_size)}
    
    # 2. Assert: If any item overlapped, the final Set count would fall under 1,000
    assert len(unique_ids) == sample_size
