const width = 800;
const height = 600;
let nodes = [];
let links = [];
let nodeIdCounter = 0;

const svg = d3.select("#graph-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const linkGroup = svg.append("g")
    .attr("class", "links");

const nodeGroup = svg.append("g")
    .attr("class", "nodes");

const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .on("tick", ticked);
	

	


function ticked() {
    linkGroup.selectAll("line")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    nodeGroup.selectAll("g")
        .attr("transform", d => `translate(${d.x},${d.y})`);
}

function editNode(event, d) {
    // Prevent the default click event from firing
    event.preventDefault();

    // Check if the textarea is already open
    const isOpen = d3.select(this).select(".node-textarea").node();

    // If the textarea is open, close it and restore the node size
    if (isOpen) {
        // Remove the textarea
        d3.select(this).select(".node-textarea").remove();

        // Restore the size of the node
        d3.select(this).select("circle")
            .transition()
            .duration(250)
            .attr("r", d => Math.max(10, d.degree * 5)); // Adjust back to original size based on degree

        // Restore the text in the node to the attribute value
        d3.select(this).select("text")
            .text(d => d.text || d.name);

        // No further action needed
        return;
    }

    // If the textarea is not open, proceed to open it
    d3.selectAll(".node-textarea").remove();

    // Increase the size of the node
    d3.select(this).select("circle")
        .transition()
        .duration(250)
        .attr("r", 40);

    // Append a textarea inside the node group
    const textarea = d3.select(this).append("foreignObject")
        .attr("class", "node-textarea")
        .attr("width", 80)
        .attr("height", 60)
        .attr("x", -40)
        .attr("y", -30)
        .append("xhtml:textarea")
        .style("width", "80px")
        .style("height", "60px")
        .style("background-color", "#003300")  // Dark green background
        .style("color", "#00ff00")             // Bright green text
        .style("border", "none")
        .style("resize", "none")
        .text(d.text || "")  // Use the existing text if any

        // When the user finishes editing (on blur event)
        .on("blur", function() {
            const newText = this.value;
            d.text = newText;  // Save the text to the node data
            updateGraph();     // Update the graph
        })
        .on("click", function(event) {
            // Prevent click event from propagating to parent node
            event.stopPropagation();
        });

    // Automatically focus on the textarea
    textarea.node().focus();
}



function updateGraph() {
    // Reset node degrees
    nodes.forEach(node => node.degree = 0);

    // Calculate degrees for each node
    links.forEach(link => {
        nodes.find(node => node.id === link.source.id).degree++;
        nodes.find(node => node.id === link.target.id).degree++;
    });

    const linkElements = linkGroup.selectAll("line")
        .data(links);

    linkElements.exit().remove();

    linkElements.enter().append("line")
        .attr("class", "link")
        .merge(linkElements);

    const nodeElements = nodeGroup.selectAll("g")
        .data(nodes, d => d.id);

	const nodeEnter = nodeElements.enter()
		.append("g")
		.attr("class", "node")
		.call(d3.drag()
			.on("start", dragStarted)
			.on("drag", dragged)
			.on("end", dragEnded))
		.on("click", selectNode)
		.on("dblclick", editNode); // Add this line to handle double-click

	nodeEnter.append("circle")
		.attr("r", d => Math.max(10, d.degree * 5, d.text ? d.text.length * 3 : 0))  // Adjust the radius based on degree and text length
		.attr("fill", "#69b3a2");


	nodeEnter.append("text")
		.attr("dx", 25)
		.attr("dy", 5)
		.text(d => d.text || d.name);  // Use the text attribute if available


    nodeElements.exit().remove();

    nodeEnter.merge(nodeElements)
        .select("circle")
        .attr("r", d => Math.max(10, d.degree * 5)); // Adjust the radius for existing nodes

    nodeEnter.merge(nodeElements)
        .select("text")
        .text(d => d.name);

    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.alpha(1).restart();
}





function selectNode(event, d) {
    if (event.shiftKey) { // only when press shift button, allow multiple selection
        d3.select(this).classed("selected", !d3.select(this).classed("selected"));
    } else {
        d3.selectAll(".node").classed("selected", false);
        d3.select(this).classed("selected", true);
    }
}


function addNode() {
    const newNode = { id: ++nodeIdCounter, name: `Node ${nodeIdCounter}` };
    nodes.push(newNode);
    updateGraph();
}

function removeNode() {
    const selected = d3.select(".node.selected");
    if (!selected.empty()) {
        const nodeId = selected.datum().id;
        nodes = nodes.filter(n => n.id !== nodeId);
        links = links.filter(l => l.source.id !== nodeId && l.target.id !== nodeId);
        updateGraph();
    }
}

function connectNodes() {
    const selectedNodes = d3.selectAll(".node.selected").data();
    if (selectedNodes.length === 2) {
        links.push({
            source: selectedNodes[0],
            target: selectedNodes[1]
        });
        d3.selectAll(".node").classed("selected", false); // cancel the node selection state
        updateGraph();
    }
}




function renameNode() {
    const selected = d3.select(".node.selected");
    if (!selected.empty()) {
        const newName = prompt("Enter new name:", selected.datum().name);
        if (newName) {
            selected.datum().name = newName;
            updateGraph();
        }
    }
}

function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

d3.select("#addNode").on("click", addNode);
d3.select("#removeNode").on("click", removeNode);
d3.select("#connectNodes").on("click", connectNodes);
d3.select("#renameNode").on("click", renameNode);

updateGraph();
