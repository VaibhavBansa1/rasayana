from django.core.management.base import BaseCommand
from recipes.models import Recipe
from django.db import transaction

class Command(BaseCommand):
    help = 'Convert analyzedInstructions into a string format'

    def process_steps(self, steps):
        """Process steps and their equipment into formatted strings"""
        formatted_steps = []
        for step in steps:
            # Get step text
            step_text = step.get('step', '').strip()
            if not step_text:
                continue

            # Add step number if available
            if step.get('number'):
                step_text = f"{step['number']}. {step_text}"
            formatted_steps.append(step_text)

            # Add equipment info if available
            equipment = step.get('equipment', [])
            if equipment:
                eq_names = []
                for eq in equipment:
                    name = eq.get('localizedName') or eq.get('name')
                    if name:
                        eq_names.append(name)
                if eq_names:
                    formatted_steps.append(f"   Equipment needed: {', '.join(eq_names)}")

        return formatted_steps

    def handle(self, *args, **options):
        with transaction.atomic():
            recipes = Recipe.objects.all()
            total = recipes.count()
            updated = 0
            skipped = 0

            self.stdout.write(self.style.SUCCESS(f"Processing {total} recipes..."))

            for recipe in recipes:
                try:
                    if not recipe.analyzedInstructions:
                        skipped += 1
                        continue

                    all_instructions = []
                    
                    # Handle each instruction section
                    for instruction_section in recipe.analyzedInstructions:
                        section_text = []
                        
                        # Add section name if it exists and is not empty
                        if instruction_section.get('name'):
                            section_text.append(f"== {instruction_section['name']} ==")
                        
                        # Process steps in this section
                        steps = instruction_section.get('steps', [])
                        if steps:
                            # Sort steps by number to ensure correct order
                            sorted_steps = sorted(steps, key=lambda x: x.get('number', 0))
                            section_text.extend(self.process_steps(sorted_steps))
                        
                        if section_text:
                            all_instructions.extend(section_text)
                            # Add a blank line between sections
                            all_instructions.append("")

                    # Join all instructions with newlines, remove trailing empty line
                    final_instructions = "\n".join(all_instructions).strip()

                    # Update the recipe if we have instructions
                    if final_instructions:
                        recipe.instructions = final_instructions
                        recipe.save(update_fields=['instructions'])
                        updated += 1
                    else:
                        skipped += 1

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"Error processing recipe {recipe.id}: {str(e)}")
                    )

            self.stdout.write(
                self.style.SUCCESS(
                    f"Finished processing recipes:\n"
                    f"- Updated: {updated}\n"
                    f"- Skipped (no valid instructions): {skipped}\n"
                    f"- Total processed: {total}"
                )
            )