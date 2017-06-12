function RunKmeans(iterations, clusters, dataSet) {
    var actualIterations = 0;
    var SSE = 0;
    var centroids = [];

    for (var i = dataSet.length - 1; i >= 0; i--) {
        if (dataSet[i] !== null)
            dataSet[i].cluster_id = 0;
        else
            dataSet.splice(i, 1);
    }

    GenerateCentroids();

    for (var i = 0; i < iterations; i++) {
        actualIterations = (i + 1);
        var oldCentroids = centroids.slice();

        dataSet.forEach(function (v) {
            //Assign each vector to the closest available centroid
            v = AssignToCentroid(v);
        })

        //Recompute the centroids of each cluster using the updated mean of all vectors
        RecomputeCentroids();

        //Check if all centroids have stopped changing, if so then break
        if (HaveCentroidsStopped(oldCentroids)) {
            break;
        }
    }

    ComputeKmeansSSE();
    return [dataSet, SSE];

    function GenerateCentroids() {
        for (var i = 0; i < clusters; i++) {
            //Add the new centroid using a random vector from the dataset
            centroids.push(RandomVector());
        }
    }

    //Get a random vector from the dataset that hasn't been used in a cluster yet
    function RandomVector() {
        while (true) {
            var randomVector = dataSet[Math.floor(Math.random() * dataSet.length)];
            if ((centroids.indexOf(randomVector) == -1) || (centroids.length == 0)) {
                break;
            }
        }
        return randomVector;
    }

    //Assign each vector to the closest available cluster
    function AssignToCentroid(vector) {
        var distanceOld = Number.MAX_SAFE_INTEGER;
        for (var i = 0; i < centroids.length; i++) {
            var distanceNew = Distance(centroids[i], vector);
            if (distanceNew < distanceOld) {
                distanceOld = distanceNew;
                vector.cluster_id = i;
            }
        }
        return vector;
    }

    //Calculate the distance between two vectors
    function Distance(vector1, vector2) {
        var distance = 0.0;
        for (var i = 0; i < (Object.keys(vector1).length - 1) ; i++) {
            distance += Math.pow((vector1[Object.keys(vector1)[i]] - vector2[Object.keys(vector2)[i]]), 2);
        }
        return Math.sqrt(distance);
    }

    //Recompute the mean of the centroids using the newly assigned points of the cluster
    function RecomputeCentroids() {
        for (var i = 0; i < clusters; i++) {
            var clusterSet = []
            dataSet.forEach(function (v) {
                if (v.cluster_id == i)
                    clusterSet.push(v);
            })
            var key1 = Object.keys(dataSet[0])[0];
            var key2 = Object.keys(dataSet[0])[1];
            var newCluster = {}
            newCluster[key1] = 0;
            newCluster[key2] = 0;
            newCluster['cluster_id'] = 0;

            newCluster = Sum(clusterSet, newCluster);
            newCluster = Divide(clusterSet.length, newCluster);
            centroids[i] = newCluster;
        }
    }

    //Returns a vector containing the sum of all vectors in a cluster
    function Sum(clusterSet, newCluster) {
        for (var i = 0; i < clusterSet.length; i++) {
            for (var j = 0; j < (Object.keys(newCluster).length - 1) ; j++) {
                newCluster[Object.keys(newCluster)[j]] += clusterSet[i][Object.keys(clusterSet[0])[j]];
            }
        }
        return newCluster;
    }

    //Returns a vector where the sum of all points in a cluster has been divided by the amount of vectors inside of that cluster
    function Divide(clusterSize, newCluster) {
        for (var i = 0; i < (Object.keys(newCluster).length - 1) ; i++) {
            newCluster[Object.keys(newCluster)[i]] /= clusterSize;
        }
        return newCluster;
    }

    //Check if the means for all centroids have changed.
    function HaveCentroidsStopped(oldCentroids) {
        var CentroidsStopped = true;
        for (var i = 0; i < centroids.length; i++) {
            for (var j = 0; j < (Object.keys(centroids[0]).length - 1) ; j++) {
                if (centroids[i][Object.keys(centroids[0])[j]] != oldCentroids[i][Object.keys(oldCentroids[0])[j]])
                    CentroidsStopped = false;
                break;
            }
            if (CentroidsStopped == false)
                break;
        }
        return CentroidsStopped;
    }

    function ComputeKmeansSSE() {
        for (var i = 0; i < dataSet.length; i++) {
            var assignedCluster = dataSet[i].cluster_id;
            SSE += Math.pow(Distance(centroids[assignedCluster], dataSet[i]), 2);
        }
    }
}