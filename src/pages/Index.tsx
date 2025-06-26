
import React, { useState } from 'react';
import QuizIntro from '../components/QuizIntro';
import QuizQuestion from '../components/QuizQuestion';
import QuizResults from '../components/QuizResults';
import Header from '../components/Header';
import { questions, calculateProfile, getProfileDescription, getRecommendedWines } from '../data/quizData';
import { useQuizResults } from '@/hooks/useQuizResults';

const Index = () => {
  const [currentStep, setCurrentStep] = useState('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [id: number]: string }>({});
  const { saveQuizResult, isSaving } = useQuizResults();

  const handleStartQuiz = () => {
    setCurrentStep('quiz');
    setCurrentQuestion(0);
    setAnswers({});
  };

  const handleAnswer = (answer: string) => {
    const newAnswers = { ...answers, [questions[currentQuestion].id]: answer };
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Quiz completed, calculate results and save to database
      const result = calculateProfile(answers);
      
      // Save to database (async, but don't wait for it)
      saveQuizResult(result, answers);
      
      setCurrentStep('results');
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStep('intro');
    setCurrentQuestion(0);
    setAnswers({});
  };

  const handleBackToStart = () => {
    setCurrentStep('intro');
    setCurrentQuestion(0);
    setAnswers({});
  };

  const result = currentStep === 'results' ? calculateProfile(answers) : null;
  const description = result ? getProfileDescription(result) : '';
  const recommendations = result ? getRecommendedWines(result) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {currentStep === 'intro' && (
          <QuizIntro onStart={handleStartQuiz} />
        )}

        {currentStep === 'quiz' && (
          <QuizQuestion
            question={questions[currentQuestion]}
            currentAnswer={answers[questions[currentQuestion].id] || ''}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFirst={currentQuestion === 0}
            isLast={currentQuestion === questions.length - 1}
            currentQuestionIndex={currentQuestion}
            totalQuestions={questions.length}
            onBackToStart={handleBackToStart}
          />
        )}

        {currentStep === 'results' && result && (
          <QuizResults
            result={result}
            description={description}
            recommendations={recommendations}
            onRestart={handleRestart}
          />
        )}

        {isSaving && (
          <div className="fixed top-4 right-4 bg-red-100 border border-red-200 text-red-800 px-4 py-2 rounded-lg shadow-md">
            Guardando resultados...
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
