import './App.css';
import * as d3 from 'd3' // Import D3
import React, { useEffect, useState } from 'react'
import rawData from './data/responses.csv'
import metadata from './data/metadata.json'

const getData = async () => {
  let data = await d3.csv(rawData, function(data) {
    return {
      'doi': data["doi"],
      'social-bonding': parseInt(data["social-bonding"]) - 3,
      'credible-signaling': parseInt(data["credible-signaling"]) - 3,
      'adequacy': parseInt(data["adequacy"]) - 3
    }
  })
  return data.filter(d => d['doi'] !== '')
}

const getCountData = data => {
  const groups = {}
  for(let x=-2; x<=2; x++) {
    for(let y=-2; y<=2; y++) {
      let point = [x, y]
      groups[point] = {
        point: point,
        x: x,
        y: y,
        count: 0,
        entries: []
      }
    }
  }

  data.forEach(d => {
    const point = [d['social-bonding'], d['credible-signaling']]
    groups[point]['count'] += 1
    groups[point]['entries'].push(d)
  })
  return Object.values(groups)
}

/**
 * The dot product of two lists.
 * @param {list} a The first array
 * @param {list} b The second
 * @returns The dot-product of a and b
 */
const dot = (a, b) => (
  a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n));

/**
 * Get the color corresponding to a particular point in the grid.
 * @param {int} x Horizontal coordinate
 * @param {int} y Vertical coordinate
 * @returns a color
 */
const getColor = (x, y) => {
  const colorDiag = [1 / Math.sqrt(2), -1 / Math.sqrt(2)];
  const vmin = dot(colorDiag, [-2, 2])
  const vmax = dot(colorDiag, [2, -2]) + 1.5
  const colorScale = d3.scaleSequential()
    .domain([vmin, vmax])
    .interpolator(d3.interpolatePlasma);
  const projection = dot([x, y], colorDiag)
  return colorScale(projection)
  }

async function createGraph({ onPointClick }) {
  // Load data
  const data = await getData()
  const countData = getCountData(data);

  const 
    margin = { top: 20, right: 20, bottom: 20, left: 20 },
    width = 600 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

  const xScale = d3.scaleLinear()
    .domain([-3, 3])
    .range([0, width]);
  const yScale = d3.scaleLinear()
    .domain([-3, 3])
    .range([height, 0]);
  const factor = 28
  const rScale = d3.scaleLinear()
    .domain([0, 6])
    .range([3, factor * Math.sqrt(6/Math.PI)]);

  

  const svg = d3.select(".App .graph").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);
  const gridLayer = svg.append('g').attr('class', 'grid layer');
  const dataLayer = svg.append('g').attr('class', 'data layer');
  
  const handleCircleClick = (e) => {
    // todo: ignore count 0 ones
    const group = e.target.parentNode
    console.log(group)
    dataLayer.selectAll('.point').classed('active', false)
    group.classList.add('active')
    const dois = group.getAttribute('data-dois').split(',')
    const color = group.getAttribute('data-color')
    onPointClick(dois, color)
  }

  const points = dataLayer.selectAll('g.point').data(countData)
  const pointsEnter = points.enter().append('g')
 
  pointsEnter.classed('point', true)
    .attr('data-color', d => getColor(d.x, d.y))
    .attr('data-dois', d => d.entries.map(e => e.doi))

  pointsEnter.append('circle')
    .attr('data-count', d => d.count)
    .attr('data-color', d => getColor(d.x, d.y))
    .attr('r', d => rScale(d.count))
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .style('fill', d => getColor(d.x, d.y))
    .on('click', handleCircleClick)

  const fontSize = 10;
  pointsEnter.append('text')
    .attr('x', d => xScale(d.x))
    .attr('y', d => yScale(d.y) + 0.3 * fontSize)
    .text(d => d.count > 0 ? `${d.count}` : '')
    .attr('font-size', fontSize)
    .on('click', handleCircleClick)

  pointsEnter.exit().remove();

  // Draw grid
  const gridPad = 0.3
  const xs = d3.range(-2, 3, 1)
  gridLayer.selectAll('.vertical-gridline').data(xs)
    .enter()
      .append('line')
      .attr('class', 'vertical-gridline gridline')
      .attr('x1', d => xScale(d))
      .attr('y1', yScale(-2 - gridPad))
      .attr('x2', d => xScale(d))
      .attr('y2', yScale(2 + gridPad));

  gridLayer.selectAll('.horizontal-gridline').data(xs)
    .enter()
      .append('line')
      .attr('class', 'vertical-grid-line gridline')
      .attr('y1', d => yScale(d))
      .attr('x1', xScale(-2 - gridPad))
      .attr('y2', d => yScale(d))
      .attr('x2', xScale(2 + gridPad));
  
  gridLayer.selectAll('.gridline')
    .style("stroke", "#eee");

  const drawTickLabel = (parent, line1, line2, x1, y1, x2, y2, align) => {
    const tick = parent.append('g').attr('class', 'tick-label')
    
    tick.append('text')
      .attr('class', 'first-line')
      .attr('x', xScale(x1))
      .attr('y', yScale(y1))
      .attr('font-size', 10)
      .attr('text-anchor', align)
      .attr('fill', '#666')
      .text(line1)
  
    tick.append('text')
      .attr('class', 'second-line')
      .attr('x', xScale(x2))
      .attr('y', yScale(y2))
      .attr('font-size', 10)
      .attr('text-anchor', align)
      .attr('font-weight', 'bold')
      .attr('fill', '#666')
      .text(line2)
  
  }
    
  const xLabel = gridLayer.append('text')
    .attr('x', xScale(0))
    .attr('y', yScale(-2.75))
    .attr('text-anchor', 'middle')
    .text('Social bonding')

  const yLabelContainer = gridLayer.append('g')
    .attr('transform', `translate(${xScale(-2.5)}, ${yScale(0)})`)
    
  yLabelContainer.append('text')
    .attr('transform', 'rotate(-90, 0, 0)')
    .attr('text-anchor', 'middle')
    .text('Credible signaling')

  drawTickLabel(gridLayer, 'strongly', 'critical', -2, -2.5, -2, -2.7, 'middle')
  drawTickLabel(gridLayer, 'strongly', 'supportive', 2, -2.5, 2, -2.7, 'middle')
  drawTickLabel(gridLayer, 'strongly', 'supportive', -2.5, 2.1, -2.5, 1.9, 'end')
  drawTickLabel(gridLayer, 'strongly', 'critical', -2.5, -1.9, -2.5, -2.1, 'end')
}

function Author({ data, num, num_authors }) {
  return (
    <span key={num}>
      <a href={data.ORCID}>
        {data.given} {data.family}
      </a>
      { num === num_authors - 2 
        ? " & "
        : num === num_authors - 1 ? "": ", " }
    </span>
  )
}

function Paper({ data, visible, color }) {
  return (
    <div className={ visible ? "paper" : 'paper hidden'} 
      key={data.DOI} data-doi={data.DOI} style={{ color: color }}>
      <h3>{ data.title }</h3>
      <p className="authors">
        { data.author.map((authorData, i) => {
            return <Author data={authorData} num={i} key={i} num_authors={data.author.length} />
          })
        }
      </p>
      <p>
        {data.abstract}
      </p>
      <p>
        <a href={ `https://doi.org/${data.DOI}`} className="button" target="_blank">View paper</a>
      </p>
    </div>
  )
}

export default function App() {
  // https://medium.com/@stopyransky/react-hooks-and-d3-39be1d900fb

  const [activeDois, setActiveDois] = useState([]);
  const [activeColor, setActiveColor] = useState('#000000');

  useEffect(() => {
    createGraph({ onPointClick: (dois, color) => { 
      setActiveDois(dois);
      setActiveColor(color);
    } });
  }, [])

  const dois = Object.keys(metadata)

  return (
    <div className="App">
      <div class="header">
        <h1>Social bonding or credible signaling?</h1>
        <p className="intro">
            An upcoming issue of {" "}
            <a href="https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/volume/754CEA3F64D634A7B205A922E359BA7C" target="_blank">
              Behavioral and Brain Sciences
            </a>{" "}
            contains two target articles discussing the origins of musicality.{" "}
            <a href="https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/origins-of-music-in-credible-signaling/82D36C04DA04D96AD9A77EEAF4BBFB34" target="_blank">Sam Mehr and colleagues</a> argue that musicality originates in credible signaling, while <a href="https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/music-as-a-coevolved-system-for-social-bonding/F1ACB3586FD3DD5965E56021F506BC4F" target="_blank">
              Pat Savage and colleagues
            </a> instead point to social bonding.
          </p>
          <p className="intro">
            <strong>We asked the many commentators where they would position themselves in this debate. Click on the points below to find out!</strong>
        </p>
      </div>
      <div className="graph"></div>
      <div className="papers">
        { dois.map((doi) => {
          const paper = metadata[doi]
          return <Paper data={paper} key={doi} color={activeColor}
            visible={ activeDois.includes(doi) } /> 
        }) }
      </div>
      <div className="credits">
        <p>A project by Henkjan Honing and Bas Cornelissen</p>
        <p>Data and code available on <a href="https://github.com/bacor/bbs-commentaries" target="_blank">GitHub</a></p>
      </div>
    </div>
  );
}