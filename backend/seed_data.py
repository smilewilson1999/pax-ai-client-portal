"""
Seed script to populate the database with initial data
"""
from sqlmodel import Session
from database import engine
from models import ClaimTemplate

def seed_claim_templates():
    """
    Add initial claim templates to the database
    """
    templates_data = [
        {
            "id": "template-duty-drawback-manufacturing",
            "name": "Manufacturing Duty Drawback",
            "description": "For manufacturers who export products made with imported materials",
            "required_documents": [
                "Commercial Invoice (Import)",
                "Commercial Invoice (Export)", 
                "Bill of Lading (Import)",
                "Bill of Lading (Export)",
                "Customs Entry Documentation",
                "Manufacturing Records",
                "Product Specifications",
                "Certificate of Origin"
            ]
        },
        {
            "id": "template-duty-drawback-unused", 
            "name": "Unused Merchandise Drawback",
            "description": "For unused imported goods that are exported in the same condition",
            "required_documents": [
                "Commercial Invoice (Import)",
                "Commercial Invoice (Export)",
                "Bill of Lading (Import)", 
                "Bill of Lading (Export)",
                "Customs Entry Documentation",
                "Certificate of Non-Use",
                "Warehouse Records",
                "Product Condition Report"
            ]
        },
        {
            "id": "template-duty-drawback-rejected",
            "name": "Rejected Merchandise Drawback", 
            "description": "For imported goods rejected and exported due to defects or non-conformity",
            "required_documents": [
                "Commercial Invoice (Import)",
                "Commercial Invoice (Export)",
                "Bill of Lading (Import)",
                "Bill of Lading (Export)", 
                "Customs Entry Documentation",
                "Rejection Certificate",
                "Quality Inspection Report",
                "Return Authorization"
            ]
        },
        {
            "id": "template-duty-drawback-substitution",
            "name": "Substitution Manufacturing Drawback",
            "description": "For manufacturers using domestic materials to substitute imported materials",
            "required_documents": [
                "Commercial Invoice (Import)",
                "Commercial Invoice (Export)",
                "Bill of Lading (Export)",
                "Customs Entry Documentation", 
                "Manufacturing Records",
                "Material Substitution Certificate",
                "Production Timeline Documentation",
                "Quality Control Records"
            ]
        }
    ]
    
    with Session(engine) as session:
        # Check if templates already exist
        from sqlmodel import select
        statement = select(ClaimTemplate)
        existing_templates = session.exec(statement).all()
        if existing_templates:
            print("Existing templates found, removing them...")
            for template in existing_templates:
                session.delete(template)
            session.commit()
        
        # Add templates
        for template_data in templates_data:
            # Convert required_documents list to JSON string
            import json
            template_data_copy = template_data.copy()
            template_data_copy["required_documents"] = json.dumps(template_data["required_documents"])
            template = ClaimTemplate(**template_data_copy)
            session.add(template)
        
        session.commit()
        print(f"Added {len(templates_data)} claim templates to the database")

if __name__ == "__main__":
    seed_claim_templates() 