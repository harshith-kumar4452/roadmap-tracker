import { Component } from 'react';
import { Alert, AlertTitle, Button, Stack } from '@mui/material';

// Shows a message instead of a blank page when a page crashes while rendering.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    // Navigating to another page clears the error.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>This page couldn't be shown</AlertTitle>
        {String(this.state.error?.message || this.state.error)}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button size="small" variant="outlined" color="inherit" onClick={() => window.location.reload()}>Reload</Button>
          <Button size="small" color="inherit" href="#/">Home</Button>
        </Stack>
      </Alert>
    );
  }
}
