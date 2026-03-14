import { Component } from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info);
    }
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='flex flex-col items-center justify-center h-full p-8 text-center'>
          <h1 className='text-2xl font-bold text-gray-800 mb-4'>
            Something went wrong
          </h1>
          <p className='text-gray-600 mb-6'>
            The app encountered an unexpected error. Your match data should be
            safe.
          </p>
          <button
            onClick={() => this.handleReset()}
            className='px-6 py-3 bg-blue-600 text-white rounded-lg font-medium'
          >
            Return to Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
