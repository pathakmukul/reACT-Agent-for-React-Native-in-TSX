import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Anthropic } from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = 'PUT YOUR API KEY HERE';

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

class Agent {
  private systemPrompt: string;
  private messages: Message[];

  constructor(systemPrompt: string = "") {
    this.systemPrompt = systemPrompt;
    this.messages = [];
  }

  async call(message: string = ""): Promise<string> {
    if (message) {
      this.messages.push({ role: "user", content: message });
    }
    const result = await this.execute();
    this.messages.push({ role: "assistant", content: result });
    return result;
  }

  private async execute(): Promise<string> {
    try {
      console.log('Executing agent with messages:', JSON.stringify(this.messages, null, 2));
      const response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 4000,
        temperature: 0.7,
        system: this.systemPrompt,
        messages: this.messages,

      });

      const result = response.content[0].text;
      console.log('Received response:', result);
      return result;
    } catch (error) {
      console.error('Error in agent execution:', error);
      throw error;
    }
  }
}

const systemPrompt = `
You run in a loop of Thought, Action, PAUSE, Observation.
At the end of the loop you output an Answer.
Use Thought to describe your thoughts about the question you have been asked.
Use Action to run one of the actions available to you - then return PAUSE.
Observation will be the result of running those actions.
Your available actions are:
calculate:
e.g. calculate: 4 * 7 / 3
Runs a calculation and returns the number - uses JavaScript so be sure to use floating point syntax if necessary
get_country_area:
e.g. get_country_area: Russia
Returns the area of the country in square kilometers.
Example session:
Question: What is the area of Russia plus Canada?
Thought: I need to find the area of Russia.
Action: get_country_area: Russia
PAUSE 
You will be called again with this:
Observation: 17098242
Thought: I need to add this to the area of Canada.
Action: get_country_area: Canada
PAUSE
You will be called again with this: 
Observation: 9984670
If you have the answer, output it as the Answer.
Answer: The total area is 27082912 square kilometers.
Now it's your turn:
`.trim();

const calculate = (operation: string): number => {
  return eval(operation);
};

const getCountryArea = (country: string): number => {
  switch (country.toLowerCase()) {
    case "russia": return 17098242;
    case "canada": return 9984670;
    case "china": return 9596961;
    case "united states": return 9372610;
    case "brazil": return 8515767;
    case "australia": return 7692024;
    case "india": return 3287263;
    case "argentina": return 2780400;
    case "kazakhstan": return 2724900;
    case "algeria": return 2381741;
    default: return 0.0;
  }
};

const App: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const runQuery = async () => {
    setLoading(true);
    setResult('');
    const agent = new Agent(systemPrompt);
    const tools = ["calculate", "getCountryArea"];
    let nextPrompt = query;
    let finalAnswer = '';
  
    try {
      for (let i = 0; i < 10; i++) {
        console.log(`Iteration ${i + 1}, sending prompt:`, nextPrompt);
  
        // Get response from the agent
        const response = await agent.call(nextPrompt);
        console.log(`Received response:`, response);
  
        // Update the UI progressively
        finalAnswer += response + '\n';
        setResult(prevResult => prevResult + response + '\n');
  
        // Introducing a slight delay to ensure the UI updates before the next loop
        await new Promise(resolve => setTimeout(resolve, 100));
  
        if (response.includes("Answer:")) {
          // If we have an answer, break the loop
          break;
        }
  
        if (response.includes("PAUSE") && response.includes("Action")) {
          const actionMatch = response.match(/Action: ([a-z_]+): (.+)/i);
          if (actionMatch) {
            const [, chosenTool, arg] = actionMatch;
            if (tools.includes(chosenTool)) {
              let resultTool;
              if (chosenTool === 'calculate') {
                resultTool = calculate(arg);
              } else if (chosenTool === 'getCountryArea') {
                resultTool = getCountryArea(arg);
              }
              nextPrompt = `Observation: ${resultTool}`;
            } else {
              nextPrompt = "Observation: Tool not found";
            }
            
            console.log('Next prompt:', nextPrompt);
            // Append the observation to the finalAnswer and update UI
            finalAnswer += nextPrompt + '\n';
            setResult(prevResult => prevResult + nextPrompt + '\n');
  
            // Ensure the UI updates before the next loop
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            // If we can't parse the action, break the loop
            break;
          }
        } else {
          // If we don't have a PAUSE and Action, break the loop
          break;
        }
      }
    } catch (error) {
      console.error('Error during query execution:', error);
      setResult(prevResult => prevResult + 'Error: ' + JSON.stringify(error) + '\n');
    } finally {
      setLoading(false);
    }
  };
  
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>reACT Native Agent TSX</Text>

      <TextInput
        style={styles.input}
        onChangeText={setQuery}
        value={query}
        placeholder="Enter your query"
        placeholderTextColor="#888"
      />
      <Button title="Run Query" onPress={runQuery} disabled={loading} color="#1E90FF" />
      <ScrollView style={styles.resultContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#1E90FF" />
        ) : (
          <Text style={styles.resultText}>{result}</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 40,
    borderColor: '#1E90FF',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#FFF',
  },
  resultContainer: {
    marginTop: 20,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 5,
    borderColor: '#DDD',
    borderWidth: 1,
    maxHeight: 600,
  },
  resultText: {
    fontSize: 16,
    color: '#333',
  },
});

export default App;
