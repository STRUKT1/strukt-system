/**
 * Unit tests for LLM Pipeline and System Prompt functionality
 * 
 * Tests verify that system prompt injection and memory stitching work correctly
 * without requiring live API calls to OpenAI.
 */

const assert = require('assert');

function runLLMPipelineTests() {
  console.log('🚀 Running LLM Pipeline Tests\n');
  
  // Test system prompt module
  testSystemPromptModule();
  
  // Test system prompt injection
  testSystemPromptInjection();
  
  // Test memory stitching
  testMemoryStitching();
  
  // Test profile context
  testProfileContext();
  
  console.log('🎉 All LLM Pipeline tests passed!\n');
}

function testSystemPromptModule() {
  console.log('🧪 Testing System Prompt Module...');
  
  try {
    const { 
      getStruktSystemPrompt, 
      getBaseSystemPrompt,
      buildMemoryContext,
      buildProfileContext 
    } = require('../src/ai/struktSystem');
    
    // Test base prompt retrieval
    const basePrompt = getBaseSystemPrompt();
    assert(basePrompt && basePrompt.length > 0, 'Base system prompt should not be empty');
    assert(basePrompt.includes('STRUKT Coach'), 'Base prompt should contain STRUKT Coach');
    console.log('✅ Base system prompt loaded correctly');
    
    // Test empty context
    const emptyPrompt = getStruktSystemPrompt();
    assert(emptyPrompt === basePrompt, 'Empty context should return base prompt');
    console.log('✅ Empty context handling works');
    
    // Test memory context building
    const memory = [
      { message: 'Hello', aiResponse: 'Hi there!' },
      { message: 'How are you?', aiResponse: 'I\'m doing well, thanks!' }
    ];
    const memoryContext = buildMemoryContext(memory);
    assert(memoryContext.includes('Conversation 1'), 'Memory context should include conversation numbering');
    assert(memoryContext.includes('Hello'), 'Memory context should include user message');
    assert(memoryContext.includes('Hi there!'), 'Memory context should include AI response');
    console.log('✅ Memory context building works');
    
    // Test profile context building
    const profile = {
      'Main Goal': 'Weight loss',
      'Dietary Needs/Allergies': 'Vegetarian',
      'Preferred Coaching Tone': 'Motivational'
    };
    const profileContext = buildProfileContext(profile);
    assert(profileContext.includes('Goals: Weight loss'), 'Profile context should include goals');
    assert(profileContext.includes('Dietary needs: Vegetarian'), 'Profile context should include dietary needs');
    assert(profileContext.includes('Coaching tone: Motivational'), 'Profile context should include coaching tone');
    console.log('✅ Profile context building works');
    
  } catch (error) {
    console.log(`❌ System prompt module test failed: ${error.message}`);
    throw error;
  }
}

function testSystemPromptInjection() {
  console.log('🧪 Testing System Prompt Injection...');
  
  try {
    const { getStruktSystemPrompt } = require('../src/ai/struktSystem');
    
    // Mock profile and memory data
    const mockProfile = {
      'Main Goal': 'Muscle gain',
      'Dietary Needs/Allergies': 'None',
      'Preferred Coaching Tone': 'Friendly'
    };
    
    const mockMemory = [
      { message: 'I want to start working out', aiResponse: 'Great! Let\'s create a plan for you.' }
    ];
    
    // Generate full system prompt
    const fullPrompt = getStruktSystemPrompt(mockProfile, null, mockMemory);
    
    // Verify all components are included
    assert(fullPrompt.includes('STRUKT Coach'), 'Should include base prompt');
    assert(fullPrompt.includes('Goals: Muscle gain'), 'Should include profile goals');
    assert(fullPrompt.includes('Coaching tone: Friendly'), 'Should include coaching tone');
    assert(fullPrompt.includes('I want to start working out'), 'Should include memory context');
    console.log('✅ System prompt injection includes all context');
    
    // Test message structure for LLM calls
    const messages = [
      { role: 'system', content: fullPrompt },
      { role: 'user', content: 'What should I eat today?' }
    ];
    
    // Verify first message is system prompt
    assert(messages[0].role === 'system', 'First message should be system role');
    assert(messages[0].content.includes('STRUKT Coach'), 'System message should contain STRUKT prompt');
    assert(messages[0].content.includes('Goals: Muscle gain'), 'System message should contain user context');
    console.log('✅ First message is properly formatted system prompt');
    
  } catch (error) {
    console.log(`❌ System prompt injection test failed: ${error.message}`);
    throw error;
  }
}

function testMemoryStitching() {
  console.log('🧪 Testing Memory Stitching...');
  
  try {
    const { buildMemoryContext } = require('../src/ai/struktSystem');
    
    // Test empty memory
    const emptyMemory = buildMemoryContext([]);
    assert(emptyMemory === null, 'Empty memory should return null');
    console.log('✅ Empty memory handling works');
    
    // Test single conversation
    const singleMemory = [
      { message: 'Hello coach', aiResponse: 'Hello! How can I help you today?' }
    ];
    const singleContext = buildMemoryContext(singleMemory);
    assert(singleContext.includes('Conversation 1'), 'Should include conversation numbering');
    assert(singleContext.includes('User: Hello coach'), 'Should include user message');
    assert(singleContext.includes('Assistant: Hello! How can I help you today?'), 'Should include AI response');
    console.log('✅ Single conversation memory works');
    
    // Test multiple conversations
    const multipleMemory = [
      { message: 'What should I eat?', aiResponse: 'Let me suggest a balanced meal.' },
      { message: 'How many calories?', aiResponse: 'Aim for about 500-600 calories.' },
      { message: 'Thanks!', aiResponse: 'You\'re welcome! Keep up the great work!' }
    ];
    const multipleContext = buildMemoryContext(multipleMemory);
    assert(multipleContext.includes('Conversation 1'), 'Should include first conversation');
    assert(multipleContext.includes('Conversation 2'), 'Should include second conversation');
    assert(multipleContext.includes('Conversation 3'), 'Should include third conversation');
    assert(multipleContext.includes('What should I eat?'), 'Should include all user messages');
    assert(multipleContext.includes('You\'re welcome!'), 'Should include all AI responses');
    console.log('✅ Multiple conversation memory works');
    
    // Test memory integration in full prompt
    const { getStruktSystemPrompt } = require('../src/ai/struktSystem');
    const promptWithMemory = getStruktSystemPrompt(null, null, multipleMemory);
    assert(promptWithMemory.includes('recent conversations'), 'Should include memory section header');
    assert(promptWithMemory.includes('Conversation 1'), 'Should include conversation in full prompt');
    console.log('✅ Memory integration in full prompt works');
    
  } catch (error) {
    console.log(`❌ Memory stitching test failed: ${error.message}`);
    throw error;
  }
}

function testProfileContext() {
  console.log('🧪 Testing Profile Context...');
  
  try {
    const { buildProfileContext } = require('../src/ai/struktSystem');
    
    // Test empty profile
    const emptyProfile = buildProfileContext(null);
    assert(emptyProfile === null, 'Empty profile should return null');
    console.log('✅ Empty profile handling works');
    
    // Test Airtable-style field names
    const airtableProfile = {
      'Main Goal': ['Weight loss', 'Muscle gain'],
      'Dietary Needs/Allergies': 'Lactose intolerant',
      'Medical Considerations': 'Knee injury',
      'Preferred Coaching Tone': ['Motivational', 'Structured'],
      'Vision of Success': 'Feel confident in my body'
    };
    const airtableContext = buildProfileContext(airtableProfile);
    assert(airtableContext.includes('Goals: Weight loss, Muscle gain'), 'Should handle array goals');
    assert(airtableContext.includes('Dietary needs: Lactose intolerant'), 'Should include dietary needs');
    assert(airtableContext.includes('Medical considerations: Knee injury'), 'Should include medical info');
    assert(airtableContext.includes('Coaching tone: Motivational, Structured'), 'Should handle array coaching tone');
    assert(airtableContext.includes('Vision of success: Feel confident in my body'), 'Should include vision');
    console.log('✅ Airtable-style profile context works');
    
    // Test Supabase-style field names
    const supabaseProfile = {
      goals: 'Endurance training',
      dietary_needs: 'Vegan',
      medical_considerations: 'None',
      coaching_tone: 'Friendly',
      vision: 'Run a marathon'
    };
    const supabaseContext = buildProfileContext(supabaseProfile);
    assert(supabaseContext.includes('Goals: Endurance training'), 'Should handle Supabase goals field');
    assert(supabaseContext.includes('Dietary needs: Vegan'), 'Should handle Supabase dietary field');
    assert(supabaseContext.includes('Coaching tone: Friendly'), 'Should handle Supabase coaching field');
    assert(supabaseContext.includes('Vision of success: Run a marathon'), 'Should handle Supabase vision field');
    console.log('✅ Supabase-style profile context works');
    
    // Test partial profile
    const partialProfile = {
      'Main Goal': 'Flexibility'
    };
    const partialContext = buildProfileContext(partialProfile);
    assert(partialContext.includes('Goals: Flexibility'), 'Should handle partial profile');
    assert(!partialContext.includes('Dietary needs'), 'Should not include missing fields');
    console.log('✅ Partial profile handling works');
    
  } catch (error) {
    console.log(`❌ Profile context test failed: ${error.message}`);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runLLMPipelineTests();
}

module.exports = { runLLMPipelineTests };