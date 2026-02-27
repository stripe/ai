# EVAL_LEAK_CHECK: furever-ca518c14-4808-4ab9-974a-0551d0d97727-grader
import json
import os
import sys
from datetime import datetime
import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

# Set required environment variables for root user (paths from dockerfile)
# these variables were set for the model user but not for the root user
# which is why we need to add them here!
os.environ.setdefault("FIREFOX_PATH", "/usr/bin/firefox-esr")
os.environ.setdefault("GECKODRIVER_PATH", "/workdir/bin/geckodriver")
os.environ.setdefault("DISPLAY", ":1")

# Global variable to store the detected server URL (localhost:3000 or localhost:3001)
SERVER_BASE_URL = None

def detect_server_url():
    """Detect which port the server is running on and return the base URL."""
    import urllib.request
    import urllib.error
    
    ports = [3000, 3001]
    for port in ports:
        try:
            url = f"http://localhost:{port}"
            with urllib.request.urlopen(url, timeout=20) as response:
                if response.getcode() == 200:
                    return url
        except (urllib.error.URLError, urllib.error.HTTPError):
            continue
    
    raise Exception("Server not found on ports 3000 or 3001")

def run_payments_tests():
    """Run all payment-related tests and return results in JSON format."""
    global SERVER_BASE_URL
    
    test_results = {
        "test_run_timestamp": datetime.now().isoformat(),
        "total_tests": 0,
        "passed_tests": 0,
        "failed_tests": 0,
        "tests": [],
        "overall_status": "failed"
    }
    
    driver = None
    
    try:
        # Detect server URL before running tests
        SERVER_BASE_URL = detect_server_url()
        print(f"Detected server running at: {SERVER_BASE_URL}")
        
    except Exception as e:
        test_results["tests"].append({
            "test_name": "server_detection",
            "status": "failed",
            "error_message": f"Failed to detect server: {str(e)}",
            "expected": "Server running on localhost:3000 or localhost:3001",
            "actual": "No server found"
        })
        return test_results
    
    try:
        # Configure Firefox options
        firefox_options = Options()
        firefox_options.binary_location = os.environ["FIREFOX_PATH"]
        firefox_options.add_argument("--no-sandbox")
        firefox_options.add_argument("--disable-dev-shm-usage")

        # Set up the Firefox driver
        service = Service(executable_path=os.environ["GECKODRIVER_PATH"])
        driver = webdriver.Firefox(service=service, options=firefox_options)
        wait = WebDriverWait(driver, 20)
        
        # Test 1: Check if payments page is accessible
        test_results["tests"].append(run_test_payments_page_accessible(driver, wait))
        
        # Test 2: Check if Stripe Connect component is present
        test_results["tests"].append(run_test_stripe_connect_component(driver, wait))
        
        # Test 3: Check if payment data is displayed
        test_results["tests"].append(run_test_payment_data_displayed(driver, wait))

        # Test 4: Check if dispute management is working
        test_results["tests"].append(run_test_dispute_management(driver, wait))

        # Test 5: Check if refunds are not enabled
        test_results["tests"].append(run_test_refunds_not_enabled(driver, wait))

        # TODO: add back in after prompting for test data 
        # # Test 6: Check for successful payments
        # test_results["tests"].append(run_test_successful_payments_count(driver, wait))
        
        # # Test 7: Check for disputed payment
        # test_results["tests"].append(run_test_disputed_payment_exists(driver, wait))
        
    except Exception as e:
        test_results["tests"].append({
            "test_name": "selenium_setup",
            "status": "failed",
            "error_message": f"Failed to initialize Selenium: {str(e)}",
            "expected": "Selenium driver initialized successfully",
            "actual": f"Error: {str(e)}"
        })
    
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
    
    # Calculate summary statistics
    test_results["total_tests"] = len(test_results["tests"])
    test_results["passed_tests"] = len([t for t in test_results["tests"] if t["status"] == "passed"])
    test_results["failed_tests"] = test_results["total_tests"] - test_results["passed_tests"]
    test_results["overall_status"] = "passed" if test_results["failed_tests"] == 0 else "failed"
    
    return test_results

def run_test_payments_page_accessible(driver, wait):
    """Test if the payments page is accessible."""
    global SERVER_BASE_URL
    
    test = {
        "test_name": "payments_page_accessible",
        "status": "failed",
        "error_message": "",
        "expected": "Payments page loads by clicking 'create quickstart account' button, can create account, and can navigate to payments page via the payments tab",
        "actual": ""
    }
    
    try:
        driver.get(f"{SERVER_BASE_URL}/signup")
        # Wait for the specific "Create quickstart account" button to appear
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Create quickstart account')]")))
        test["status"] = "found 'Create quickstart account' button"
        # Click "Create quickstart account" button
        wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Create quickstart account')]"))).click()
        test["status"] = "clicked 'Create quickstart account' button"
        # Wait for the "Account created successfully" message to appear
        wait.until(EC.presence_of_element_located((By.XPATH, "//a[@href='/home']")))
        test["status"] = "account created successfully, can find home href"
        # Go to /payments page by clicking the payments tab
        wait.until(EC.element_to_be_clickable((By.XPATH, "//a[@href='/payments']"))).click()
        test["status"] = "clicked payments tab"
        # Wait for the page to load
        wait.until(EC.url_contains("/payments"))
        wait.until(lambda driver: driver.execute_script("return document.readyState") == "complete")
        test["status"] = "passed"
        test["actual"] = "Payments page (/payments) loaded successfully"
    except TimeoutException:
        test["error_message"] = "Payments page unable to be accessed within timeout"
        test["actual"] = "Payments page did not load correctly"
    except Exception as e:
        test["error_message"] = str(e)
        test["actual"] = f"Error: {str(e)}"
    
    return test

def run_test_stripe_connect_component(driver, wait):
    """Test if Stripe Connect component is present."""
    test = {
        "test_name": "stripe_connect_component",
        "status": "failed",
        "error_message": "",
        "expected": "Stripe Connect Payments component found",
        "actual": ""
    }
    
    try:
        # Create a longer wait specifically (120 seconds)
        long_wait = WebDriverWait(driver, 180)

        # check that creating test data is at least showing
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Creating test data')]")))
        test["status"] = "found creating test data"
                
        # First wait for the iframe to be present
        stripe_iframe = long_wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "[data-testid='stripe-connect-ui-layer-stripe-connect-payments']")
        ))
        
        # Then wait for it to be visible and have proper dimensions
        long_wait.until(EC.visibility_of(stripe_iframe))
        
        # Additional check: wait for iframe to have a src attribute (indicates it's loading)
        long_wait.until(lambda driver: stripe_iframe.get_attribute("src") is not None)
        
        if stripe_iframe.is_displayed():
            test["status"] = "passed"
            test["actual"] = "Found and verified Stripe Connect iframe with data-testid"
        else:
            test["actual"] = "Stripe Connect iframe found but not displayed"
    
    except TimeoutException:
        test["error_message"] = "Stripe Connect iframe not found within 180 second timeout"
        test["actual"] = "No Stripe Connect component found"
    except Exception as e:
        test["error_message"] = str(e)
        test["actual"] = f"Error searching for Stripe component: {str(e)}"
    
    return test


##### all the below tests need to run in the component iframe, so we do context switching #####

def run_test_payment_data_displayed(driver, wait):
    """Test if component is rendered by checking for some key elements in the iframe."""
    test = {
        "test_name": "payment_data_displayed",
        "status": "failed",
        "error_message": "",
        "expected": "Component is successfully rendered based on key UI elements being present: @stripe.com, Status, Amount",
        "actual": "",
        "debug_info": []
    }

    try:
        # Look for payment-related data elements
        payment_data_selectors = {
            "@stripe.com": "//*[contains(text(), '@stripe.com')]",  
            "Status": "//*[contains(text(), 'Status')]", 
            "Amount": "//*[contains(text(), 'Amount')]",  
        }
        
        found_selectors = []
        missing_selectors = []
        
        # Switch to Stripe Connect iframe using built-in expected condition
        iframe_found = False
        try:
            # Wait for iframe to be available and switch to it automatically
            wait.until(EC.frame_to_be_available_and_switch_to_it(
                (By.CSS_SELECTOR, "[data-testid='stripe-connect-ui-layer-stripe-connect-payments']")
            ))
            test["debug_info"].append("✓ Successfully switched to Stripe Connect iframe context")
            
            # Wait for iframe content to be ready
            wait.until(lambda d: len(d.find_elements(By.XPATH, "//*[text()]")) > 0)
            test["debug_info"].append("✓ Iframe content loaded")
            iframe_found = True
                
        except Exception as e:
            test["debug_info"].append(f"⚠ Could not switch to iframe: {str(e)}")
            test["debug_info"].append("Searching in main document context only")
        
        for name, selector in payment_data_selectors.items():
            try:
                elements = None
                for attempt in range(2): 
                    try:
                        # Wait for any element to appear, but handle case where none exist
                        try:
                            wait.until(EC.presence_of_element_located((By.XPATH, selector)))
                            elements = driver.find_elements(By.XPATH, selector)
                        except TimeoutException:
                            elements = []  # No elements found within timeout
                        break
                    except Exception as e:
                        if ("context has been discarded" in str(e).lower() or 
                            "browsing context" in str(e).lower()) and attempt == 0:
                            test["debug_info"].append(f"⚠ Context lost for '{name}', re-establishing iframe...")
                            driver.switch_to.default_content()
                            wait.until(EC.frame_to_be_available_and_switch_to_it(
                                (By.CSS_SELECTOR, "[data-testid='stripe-connect-ui-layer-stripe-connect-payments']")
                            ))
                            continue
                        else:
                            raise e
                
                test["debug_info"].append(f"🔍 '{name}': Found {len(elements)} elements with selector {selector}")
                
                visible_elements = [elem for elem in elements if elem.is_displayed() and elem.text.strip()]
                
                if visible_elements:
                    found_selectors.append(name)
                    test["debug_info"].append(f"✓ Found '{name}': {visible_elements[0].text[:30]}...")
                else:
                    missing_selectors.append(name)
                    test["debug_info"].append(f"✗ Missing '{name}' - {len(elements)} elements found but none visible/with text")
                    
            except Exception as e:
                missing_selectors.append(name)
                test["debug_info"].append(f"✗ Error finding '{name}': {str(e)}")
        
        if iframe_found:
            driver.switch_to.default_content()
            test["debug_info"].append("✓ Switched back to main document context")
        
        if not missing_selectors:
            test["status"] = "passed"
            test["actual"] = f"All elements found: {', '.join(found_selectors)}"
        else:
            test["actual"] = f"Found: {', '.join(found_selectors)}. Missing: {', '.join(missing_selectors)}"
            test["error_message"] = f"Missing required elements: {', '.join(missing_selectors)}"
    
    except Exception as e:
        test["error_message"] = str(e)
        test["actual"] = f"Error searching for payment data: {str(e)}"
        test["debug_info"].append(f"💥 Main exception caught: {str(e)}")
    
    return test

def run_test_dispute_management(driver, wait):
    """Test if dispute management is working."""
    test = {
        "test_name": "dispute_management",
        "status": "failed",
        "error_message": "",
        "expected": "Dispute management is available in the component",
        "actual": "",
        "debug_info": []
    }
    
    try:
        # Wait for iframe to be available and switch to it automatically
        wait.until(EC.frame_to_be_available_and_switch_to_it(
            (By.CSS_SELECTOR, "[data-testid='stripe-connect-ui-layer-stripe-connect-payments']")
        ))
        test["debug_info"].append("✓ Successfully switched to Stripe Connect iframe context")

        wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Disputes')]"))).click()
        # check that disputes table is displayed, eg "Disputed amount" shows up
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Disputed amount')]")))
        test["status"] = "on disputes tab of component"
        test["status"] = "passed"
        test["actual"] = "Dispute management is available in the component"
    except Exception as e:
        test["error_message"] = str(e)
        test["actual"] = f"Error with dispute management: {str(e)}"
    finally:
        # Always switch back to default content
        try:
            driver.switch_to.default_content()
            test["debug_info"].append("✓ Switched back to main document context")
        except Exception:
            pass
    
    return test


def run_test_refunds_not_enabled(driver, wait):
    """Test if refunds are not enabled."""
    test = {
        "test_name": "refunds_not_enabled",
        "status": "failed",
        "error_message": "",
        "expected": "Refunds are not enabled",
        "actual": "",
        "debug_info": []
    }
    
    try:
        # Wait for iframe to be available and switch to it automatically
        wait.until(EC.frame_to_be_available_and_switch_to_it(
            (By.CSS_SELECTOR, "[data-testid='stripe-connect-ui-layer-stripe-connect-payments']")
        ))
        test["debug_info"].append("✓ Successfully switched to Stripe Connect iframe context")

        # Click into "all" tab
        wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'All')]"))).click()
        test["debug_info"].append("✓ clicked into all tab")

        # Click into "succeeded" row
        wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Succeeded')]"))).click()
        test["debug_info"].append("✓ clicked into succeeded row")

        # wait for modal to appear
        time.sleep(5)

        # Switch back to main content to look for the new accessory layer iframe
        driver.switch_to.default_content()
        test["debug_info"].append("✓ Switched back to main document to look for accessory layer iframe")

        # Wait for the accessory layer iframe to appear and switch to it
        try:
            wait.until(EC.frame_to_be_available_and_switch_to_it(
                (By.CSS_SELECTOR, "[data-testid='stripe-connect-accessory-layer-stripe-connect-payments']")
            ))
            test["debug_info"].append("✓ Successfully switched to Stripe Connect accessory layer iframe context")
        except TimeoutException:
            test["debug_info"].append("⚠ Accessory layer iframe not found, searching in main document context")
            # If accessory iframe not found, stay in main document context to search
            # The refund elements might be in the main document or we need to wait longer

        # Look for "Begin refund" button - if found, test should fail
        test["debug_info"].append("🔍 Looking for 'Begin refund' elements...")
        
        refund_elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'Begin refund')]")
        test["debug_info"].append(f"Found {len(refund_elements)} elements containing 'Begin refund'")
        
        if len(refund_elements) > 0:
            # Found refund elements - this is BAD (test fails)
            test["status"] = "failed"
            test["actual"] = f"FAIL: Found {len(refund_elements)} 'Begin refund' elements - refunds are enabled when they should be disabled"
            test["error_message"] = "Refunds are enabled but should be disabled"
            
            # Add debug info about what was found
            for i, elem in enumerate(refund_elements):
                try:
                    test["debug_info"].append(f"  Refund element {i}: tag='{elem.tag_name}', displayed={elem.is_displayed()}, text='{elem.text[:50]}...'")
                except Exception:
                    test["debug_info"].append(f"  Refund element {i}: Could not read element details")
        else:
            # No refund elements found - this is GOOD (test passes)
            test["status"] = "passed"
            test["actual"] = "PASS: No 'Begin refund' elements found - refunds are properly disabled"

    
    except Exception as e:
        test["error_message"] = str(e)
        test["actual"] = f"Error searching for refunds: {str(e)}"
    finally:
        # Always switch back to default content
        try:
            driver.switch_to.default_content()
            test["debug_info"].append("✓ Switched back to main document context")
        except Exception:
            pass
    
    return test
    

def run_test_successful_payments_count(driver, wait):
    """Test if successful payments are present (expecting 10)."""
    test = {
        "test_name": "successful_payments_count",
        "status": "failed",
        "error_message": "",
        "expected": "At least 10 successful payments found",
        "actual": ""
    }
    
    try:
        # Look for successful payment indicators
        success_selectors = [
            "//*[contains(text(), 'success')]",
            "//*[contains(text(), 'Success')]",
            "//*[contains(text(), 'completed')]",
            "//*[contains(text(), 'Completed')]",
            "//*[contains(@class, 'success')]",
            "//*[contains(@class, 'completed')]"
        ]
        
        successful_count = 0
        for selector in success_selectors:
            try:
                elements = driver.find_elements(By.XPATH, selector)
                successful_count += len([elem for elem in elements if elem.is_displayed()])
            except Exception:
                continue
        
        if successful_count >= 10:
            test["status"] = "passed"
            test["actual"] = f"Found {successful_count} successful payment indicators"
        else:
            test["actual"] = f"Found only {successful_count} successful payment indicators (expected at least 10)"
    
    except Exception as e:
        test["error_message"] = str(e)
        test["actual"] = f"Error counting successful payments: {str(e)}"
    
    return test

def run_test_disputed_payment_exists(driver, wait):
    """Test if disputed payment exists (expecting 1)."""
    test = {
        "test_name": "disputed_payment_exists",
        "status": "failed",
        "error_message": "",
        "expected": "At least 1 disputed payment found",
        "actual": ""
    }
    
    try:
        # Look for disputed payment indicators
        dispute_selectors = [
            "//*[contains(text(), 'dispute')]",
            "//*[contains(text(), 'Dispute')]",
            "//*[contains(text(), 'disputed')]",
            "//*[contains(text(), 'Disputed')]",
            "//*[contains(@class, 'dispute')]",
            "//*[contains(@class, 'disputed')]"
        ]
        
        disputed_count = 0
        for selector in dispute_selectors:
            try:
                elements = driver.find_elements(By.XPATH, selector)
                disputed_count += len([elem for elem in elements if elem.is_displayed()])
            except Exception:
                continue
        
        if disputed_count >= 1:
            test["status"] = "passed"
            test["actual"] = f"Found {disputed_count} disputed payment indicators"
        else:
            test["actual"] = f"Found {disputed_count} disputed payment indicators (expected at least 1)"
    
    except Exception as e:
        test["error_message"] = str(e)
        test["actual"] = f"Error searching for disputed payments: {str(e)}"
    
    return test

if __name__ == "__main__":
    # Run the tests and output results as JSON
    results = run_payments_tests()
    
    # Output to both stdout (for immediate viewing) and a file (for grading function)
    json_output = json.dumps(results, indent=2)
    print(json_output)
    
    # Write results to a file that the grading function can read
    with open("/workdir/payment_test_results.json", "w") as f:
        f.write(json_output)
    
    # Exit with appropriate code (0 for all tests passed, 1 for any failures)
    sys.exit(0 if results["overall_status"] == "passed" else 1)