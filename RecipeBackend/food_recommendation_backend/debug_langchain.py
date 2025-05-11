import json
import traceback

# Function to patch the search_recipes function
def debug_search_recipes(original_function):
    def wrapper(user_query, context, user_preferences):
        try:
            # Log the input parameters
            print("DEBUG - search_recipes input:")
            print(f"  user_query: {user_query}")
            print(f"  context: {context}")
            
            # Extract search criteria
            from langchain_core.messages import HumanMessage
            from api.views import llm
            
            messages = [
                HumanMessage(content=f"""
            Extract search criteria from the user query and conversation history. Criteria can include ingredients, cuisines, dietary restrictions, etc.

            Conversation history:
            {context}

            User query:
            {user_query}

            Respond with a JSON object, e.g., {{"ingredients": ["tomato", "garlic"], "cuisines": ["Italian"], "dietary": ["vegan"]}}
            """)
            ]
            
            criteria_response = llm.invoke(messages)
            print("DEBUG - LLM response type:", type(criteria_response))
            print("DEBUG - LLM response dir:", dir(criteria_response))
            print("DEBUG - LLM response content:", criteria_response.content)
            print("DEBUG - LLM response repr:", repr(criteria_response.content))
            
            # Try to parse the JSON
            try:
                criteria = json.loads(criteria_response.content)
                print("DEBUG - Parsed criteria:", json.dumps(criteria, indent=2))
            except json.JSONDecodeError as e:
                print(f"DEBUG - JSON decode error: {str(e)}")
                print(f"DEBUG - Failed JSON content: '{criteria_response.content}'")
                # Try to fix common issues with the JSON
                fixed_content = criteria_response.content.strip()
                # Sometimes the LLM includes markdown backticks for JSON
                if fixed_content.startswith("```json"):
                    fixed_content = fixed_content[7:]
                if fixed_content.endswith("```"):
                    fixed_content = fixed_content[:-3]
                fixed_content = fixed_content.strip()
                print(f"DEBUG - Attempting with fixed content: '{fixed_content}'")
                criteria = json.loads(fixed_content)
                print("DEBUG - Fixed and parsed criteria:", json.dumps(criteria, indent=2))
            
            # Continue with the original function logic
            return original_function(user_query, context, user_preferences)
        except Exception as e:
            print(f"DEBUG - Exception in search_recipes: {str(e)}")
            traceback.print_exc()
            # Return a safe default response
            return {"message": "Sorry, I encountered an error while processing your request."}
    return wrapper

# Install the debug wrapper
try:
    from api.views import search_recipes
    import api.views
    api.views.search_recipes = debug_search_recipes(api.views.search_recipes)
    print("DEBUG - Successfully installed search_recipes wrapper")
except Exception as e:
    print(f"DEBUG - Failed to install wrapper: {str(e)}")
    traceback.print_exc()
