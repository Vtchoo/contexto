import random

class SnowflakeGenerator:
    MACHINE_ID_BITS = 10
    SEQUENCE_BITS = 12

    MAX_MACHINE_ID = -1 ^ (-1 << MACHINE_ID_BITS)
    MAX_SEQUENCE = -1 ^ (-1 << SEQUENCE_BITS)

    MACHINE_ID_SHIFT = SEQUENCE_BITS
    TIMESTAMP_LEFT_SHIFT = SEQUENCE_BITS + MACHINE_ID_BITS

    def __init__(self, epoch, machine_id):
        self.epoch = epoch
        self.machine_id = machine_id
        self.last_timestamp = -1
        self.generated_sequences = set()

        if self.machine_id < 0 or self.machine_id > SnowflakeGenerator.MAX_MACHINE_ID:
            raise ValueError(f"Machine ID must be between 0 and {SnowflakeGenerator.MAX_MACHINE_ID}")

    def current_time(self):
        from time import time
        return int(time() * 1000)

    def generate_id(self):
        timestamp = self.current_time()

        if timestamp < self.last_timestamp:
            raise Exception("Clock moved backwards. Refusing to generate id")

        if timestamp != self.last_timestamp:
            self.generated_sequences.clear()
            self.last_timestamp = timestamp

        while True:
            sequence = random.randint(0, SnowflakeGenerator.MAX_SEQUENCE)
            if sequence not in self.generated_sequences:
                self.generated_sequences.add(sequence)
                break

        id = ((timestamp - self.epoch) << SnowflakeGenerator.TIMESTAMP_LEFT_SHIFT) | \
             (self.machine_id << SnowflakeGenerator.MACHINE_ID_SHIFT) | \
             sequence

        return id

def parse_snowflake_id(snowflake_id, epoch):
    timestamp = (snowflake_id >> SnowflakeGenerator.TIMESTAMP_LEFT_SHIFT) + epoch
    machine_id = (snowflake_id >> SnowflakeGenerator.MACHINE_ID_SHIFT) & SnowflakeGenerator.MAX_MACHINE_ID
    sequence = snowflake_id & SnowflakeGenerator.MAX_SEQUENCE
    return timestamp, machine_id, sequence

# Usage example:
epoch = int((2020 - 1970) * 365.25 * 24 * 60 * 60 * 1000)  # Custom epoch (January 1, 2020)
machine_id = 1  # Machine ID (unique for each generator instance)

generator = SnowflakeGenerator(epoch, machine_id)

# Generate a few IDs to test the randomness and collision handling
generated_ids = set()
for _ in range(10):
    purchase_order_id = generator.generate_id()
    if purchase_order_id in generated_ids:
        print(f"Collision detected: {purchase_order_id}")
    else:
        generated_ids.add(purchase_order_id)
    print(f"Purchase Order ID: {purchase_order_id}")

parsed_timestamp, parsed_machine_id, parsed_sequence = parse_snowflake_id(purchase_order_id, epoch)

print(parsed_timestamp, parsed_machine_id, parsed_sequence)
