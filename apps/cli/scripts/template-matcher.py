import cv2
import numpy as np
import sys
import json
import argparse

def template_matching(input_image_path, template_image_path, output_image_path=None, confidence_threshold=0.7, scale_steps=[1, 0.9, 0.8, 0.7, 0.6, 0.5]):
    # Read the input and template images
    input_image = cv2.imread(input_image_path)
    original_template_image = cv2.imread(template_image_path)

    # Initialize variables for the best match
    best_match_region = None
    best_confidence = 0.0

    # Loop through each scale step
    for scale in scale_steps:
        # Resize the template image
        template_image = cv2.resize(original_template_image, None, fx=scale, fy=scale)

        # Perform template matching
        result = cv2.matchTemplate(input_image, template_image, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)

        # Check if the confidence is above the threshold and better than the previous best
        if max_val >= confidence_threshold and max_val > best_confidence:
            # Update the best match
            best_match_region = {
                "tx": int(max_loc[0]),
                "ty": int(max_loc[1]),
                "bx": int((max_loc[0] + template_image.shape[1]) ),
                "by": int((max_loc[1] + template_image.shape[0]) ),
                "confidence": f"{max_val:.2f}",
                "scale": f"{scale:.2f}"
            }
            best_confidence = max_val

            cv2.rectangle(input_image, (best_match_region["tx"], best_match_region["ty"]),
                      (best_match_region["bx"], best_match_region["by"]), (0, 0, 255), 2)
            break

    # Draw a rectangle on the input image to mark the best matched region
    if best_match_region:
        cv2.rectangle(input_image, (best_match_region["tx"], best_match_region["ty"]),
                      (best_match_region["bx"], best_match_region["by"]), (0, 255, 0), 2)

    # Save the result image with the region line drawn
    if output_image_path:
        cv2.imwrite(output_image_path, input_image)

    return best_match_region

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Template Matcher')

    # Add the arguments
    parser.add_argument('input_image_path', type=str, help='Input image path')
    parser.add_argument('template_image_path', type=str, help='Template image path')

    parser.add_argument('-o', type=str, help='Output image path')
    parser.add_argument('-c', type=float, help='Confidence threshold')
    parser.add_argument('-s', type=str, help='Scale steps')

    args = parser.parse_args()

    input_image_path = args.input_image_path
    template_image_path = args.template_image_path
    
    if args.o:
        output_image_path = args.o
    else:
        output_image_path = None
    
    if args.c:
        confidence_threshold = args.c
    else:
        confidence_threshold = 0.7

    if args.s:
        scale_steps = [float(step) for step in args.s.split(',')]
    else:
        scale_steps = [1, 0.9, 0.8, 0.7, 0.6, 0.5]

    match_region = template_matching(input_image_path, template_image_path, output_image_path, confidence_threshold, scale_steps)

    if match_region:
        print(json.dumps(match_region))
    else:
        print("None")