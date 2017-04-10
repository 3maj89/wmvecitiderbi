import React, { Component, PropTypes, createElement } from 'react'
import {canUseDOM} from 'fbjs/lib/ExecutionEnvironment'
import Slider from 'rc-slider'
import Helmet from 'react-helmet'
import 'rc-slider/assets/index.css'
import {
  play, stop, seek, next, prev, goto, gotoAndPlay, addTracks, turnOnAutoplay,
  addListener, removeListener, UpdateTypes
} from './audioPlayerCore'
import _ from 'lodash'

export function connectAudioPlayer(WrappedComponent, tracks, {autoplay=false}={}) {
  class Connect extends Component {
    constructor(props) {
      super(props)
      this.state = {
        isPlaying: false,
        currentTrack: null,
        secondsElapsed: 0,
        secondsRemaining: 0,
        timeElapsed: null,
        timeRemaining: null,
      }
    }

    componentDidMount() {
      this.listenerId = addListener(update => this.setState(_.omit(update, 'type')))
      if (autoplay) {
        turnOnAutoplay()
      }
      addTracks(tracks)
    }

    componentWillUnmount() {
      removeListener(this.listenerId)
    }

    render() {
      const props = {
        play,
        stop,
        seek,
        next,
        prev,
        goto,
        gotoAndPlay,
        isPlaying: this.state.isPlaying,
        currentTrack: this.state.currentTrack || {},
        secondsElapsed: this.state.secondsElapsed,
        secondsRemaining: this.state.secondsRemaining,
        timeElapsed: this.state.timeElapsed,
        timeRemaining: this.state.timeRemaining
      }
      return createElement(WrappedComponent, {...this.props, ...props})
    }
  }
  return Connect
}


/* TitleMarquee component */

function insertStyle(style) {
  for (let i = 0; i < document.styleSheets.length; i++) {
    try {
      document.styleSheets[i].insertRule(style, _.size(document.styleSheets[i].cssRules))
      break
    }
    catch(e) {
      if (e.name !== "SecurityError" && e.name !== 'InvalidAccessError') {
        throw e
      }
    }
  }
}

const marqueeAnimationName = 'rdap_marquee'

const baseStyle  = {
  paddingLeft: '100%',
  display: 'inline-block'
}

const getMarqueeStyle = duration => ({
  ...baseStyle,
  animation: `${marqueeAnimationName} ${duration}s infinite linear`
})

class TM extends Component {
  constructor(props) {
    super(props)
    this.state = {
      on: true,
      currentTrack: null
    }
  }

  componentDidMount() {
    this.listenerId = addListener(update => this.setState({
      currentTrack: update.currentTrack,
      on: update.type !== UpdateTypes.TRACK_SWITCH,
    }))
  }

  componentWillUnmount() {
    removeListener(this.listenerId)
  }

  render() {
    const {className, textFn, duration} = this.props
    const {currentTrack} = this.state
    const {number, artist, title} = currentTrack || {}
    return (<div className={className}>
      <Helmet>
        <style type="text/css">{`
          @keyframes ${marqueeAnimationName} {
            0% {-webkit-transform:translate(0, 0)}
            100% {-webkit-transform:translate(-100%, 0)}
          }
        `}</style>
      </Helmet>



      <div style={{overflow: 'hidden', whiteSpace: 'nowrap'}}>
        <div style={this.state.on ? getMarqueeStyle(duration || 10) : baseStyle}>
          {currentTrack ? (textFn ? textFn(currentTrack) : `${number}. ${artist} - ${title}`) : ''}
        </div>
      </div>
    </div>)
  }
}

TM.propTypes = {
  className: PropTypes.string,
  textFn: PropTypes.func,
  duration: PropTypes.number
}

export const TitleMarquee = TM


/* TimeSlider component */

class DefaultSliderHandle extends Component {
  render() {
    return <div></div>
  }
}

class TS extends Component {
  constructor(props) {
    super(props)
    this.state = {
      secondsElapsed: 0,
      secondsRemaining: 0
    }
  }

  componentDidMount() {
    this.listenerId = addListener(update =>
        this.setState(_.pick(update, ['secondsElapsed', 'secondsRemaining'])))
  }

  componentWillUnmount() {
    removeListener(this.listenerId)
  }

  render() {
    const {className, ...props} = this.props
    const {secondsElapsed, secondsRemaining} = this.state
    return (
      <div className={className}>
        <Slider onChange={seek}
                value={secondsElapsed}
                min={0}
                max={secondsElapsed + secondsRemaining}
                handle={this.props.handle || <DefaultSliderHandle />}
                {...props}
        />
      </div>
    )
  }
}

TS.propTypes = {
  className: PropTypes.string,
}

export const TimeSlider = TS


/* Playlist component */

class PL extends Component {
  constructor(props) {
    super(props)
    this.state = {
      tracks: [],
      currentTrack: null
    }
  }

  componentDidMount() {
    this.listenerId = addListener(update =>
        this.setState(_.pick(update, ['tracks', 'currentTrack'])))
  }

  componentWillUnmount() {
    removeListener(this.listenerId)
  }

  render() {
    const {className, itemClassName, currentItemClassName, itemComponent} = this.props
    const {tracks, currentTrack} = this.state
    const {number} = currentTrack || {}
    const itemStyle = {
      padding: '2px 6px',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      overflow: 'hidden'
    }
    return (
      <div className={className}>
        {tracks.map((track, i) =>
          <div key={i}
               className={number === i + 1 ? itemClassName + ' ' + currentItemClassName : itemClassName}
               style={itemStyle}
               onClick={() => number === i + 1 ? gotoAndPlay(i + 1) : goto(i + 1)}
          >
                  {itemComponent ? itemComponent(track) :
                      `${i + 1}. ${track.artist} - ${track.title}`}
          </div>)}
      </div>
    )
  }
}

PL.propTypes = {
  className: PropTypes.string,
  itemClassName: PropTypes.string,
  currentItemClassName: PropTypes.string,
  itemComponent: PropTypes.func
}

export const Playlist = PL