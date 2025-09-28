#!/usr/bin/env python3
import csv
import subprocess

# Get the common part numbers
common_parts = subprocess.check_output(
    "comm -12 /tmp/csv_part_numbers.txt /tmp/dat_part_numbers.txt",
    shell=True,
    text=True
).strip().split('\n')

# Convert to a set for faster lookup
common_parts_set = set(common_parts)

# Read the original CSV and filter it
with open('/Users/gnome/lego/brickyard/parts.csv', 'r') as infile:
    reader = csv.DictReader(infile)

    # Prepare the output file
    with open('/Users/gnome/lego/brickyard/parts_matching.csv', 'w', newline='') as outfile:
        fieldnames = reader.fieldnames
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)

        # Write header
        writer.writeheader()

        # Write only matching rows
        matching_count = 0
        for row in reader:
            if row['part_num'] in common_parts_set:
                writer.writerow(row)
                matching_count += 1

        print(f"Created parts_matching.csv with {matching_count} matching parts")
        print(f"Original CSV had {sum(1 for line in open('/Users/gnome/lego/brickyard/parts.csv'))-1} parts")
        print(f"Found {len(common_parts_set)} unique matching part numbers")